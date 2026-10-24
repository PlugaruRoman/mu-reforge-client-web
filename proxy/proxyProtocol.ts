/**
 * PROXY protocol version 2 (https://www.haproxy.org/download/2.9/doc/proxy-protocol.txt, section 2.2):
 * the binary header the relay writes as the very first bytes of each game-server connection when
 * `PROXY_PROTOCOL=v2`, so the server sees the browser's address instead of the proxy's.
 *
 * Layout, all multi-byte numbers big-endian:
 *   12 bytes  signature  0D 0A 0D 0A 00 0D 0A 51 55 49 54 0A  ("\r\n\r\n\0\r\nQUIT\n")
 *    1 byte   0x21       version 2 (high nibble), command PROXY (low nibble)
 *    1 byte   0x11       TCP over IPv4  |  0x21 TCP over IPv6
 *    2 bytes  length of what follows: 12 (IPv4) | 36 (IPv6)
 *   IPv4: src addr (4), dst addr (4), src port (2), dst port (2)
 *   IPv6: src addr (16), dst addr (16), src port (2), dst port (2)
 *
 * The receiving side must accept it only from a trusted peer (the server's TrustedProxies list): from
 * anyone else it is a forged address.
 */

export const PROXY_V2_SIGNATURE = Uint8Array.from([0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d, 0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a]);

export type ProxyProtocolMode = "off" | "v2";

/** `PROXY_PROTOCOL`: `v2` or `off` (default). Anything else throws, so a typo does not start silently. */
export function proxyProtocolFromEnv(raw: string | undefined): ProxyProtocolMode {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "" || value === "off") return "off";
  if (value === "v2") return "v2";
  throw new Error(`PROXY_PROTOCOL must be "v2" or "off", not "${raw}"`);
}

function parseIpv4(text: string): Uint8Array | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  const out = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(parts[i])) return null;
    const n = Number(parts[i]);
    if (n > 255) return null;
    out[i] = n;
  }
  return out;
}

function parseIpv6(text: string): Uint8Array | null {
  let h = text;
  // An embedded IPv4 tail (::ffff:1.2.3.4) becomes two groups.
  const lastColon = h.lastIndexOf(":");
  if (h.includes(".")) {
    const v4 = parseIpv4(h.slice(lastColon + 1));
    if (!v4) return null;
    h = `${h.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }

  const halves = h.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  const out = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    if (!/^[0-9a-f]{1,4}$/.test(groups[i])) return null;
    const n = parseInt(groups[i], 16);
    out[i * 2] = n >> 8;
    out[i * 2 + 1] = n & 0xff;
  }
  return out;
}

/** The bytes of an IPv4 (4) or IPv6 (16) literal, or null. Brackets are allowed, zone ids are not. */
export function parseIp(text: string): Uint8Array | null {
  const t = text.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (!t) return null;
  return t.includes(":") ? parseIpv6(t) : parseIpv4(t);
}

/** An IPv4 address as `::ffff:a.b.c.d`. */
function mapToV6(v4: Uint8Array): Uint8Array {
  const out = new Uint8Array(16);
  out[10] = 0xff;
  out[11] = 0xff;
  out.set(v4, 12);
  return out;
}

/** The IPv4 inside `::ffff:a.b.c.d`, or null. */
function unmapV4(v6: Uint8Array): Uint8Array | null {
  for (let i = 0; i < 10; i++) if (v6[i] !== 0) return null;
  if (v6[10] !== 0xff || v6[11] !== 0xff) return null;
  return v6.slice(12);
}

function asFamily(bytes: Uint8Array): Uint8Array {
  return bytes.length === 16 ? (unmapV4(bytes) ?? bytes) : bytes;
}

/**
 * The PROXY v2 header for a TCP connection from `source` to `destination`. Both must be IP literals
 * (the destination is the resolved address the TCP socket connected to). When one side is IPv4 and
 * the other IPv6, the IPv4 one is sent v4-mapped, so both share the IPv6 family as the spec requires.
 */
export function proxyV2Header(
  source: { ip: string; port: number },
  destination: { ip: string; port: number }
): Uint8Array {
  const src = parseIp(source.ip);
  const dst = parseIp(destination.ip);
  if (!src) throw new Error(`PROXY v2: source "${source.ip}" is not an IP address`);
  if (!dst) throw new Error(`PROXY v2: destination "${destination.ip}" is not an IP address`);

  let s = asFamily(src);
  let d = asFamily(dst);
  if (s.length !== d.length) {
    if (s.length === 4) s = mapToV6(s);
    if (d.length === 4) d = mapToV6(d);
  }

  const v6 = s.length === 16;
  const addressLength = v6 ? 36 : 12;
  const out = new Uint8Array(16 + addressLength);
  out.set(PROXY_V2_SIGNATURE, 0);
  out[12] = 0x21;
  out[13] = v6 ? 0x21 : 0x11;
  out[14] = addressLength >> 8;
  out[15] = addressLength & 0xff;
  out.set(s, 16);
  out.set(d, 16 + s.length);
  const ports = 16 + s.length * 2;
  out[ports] = (source.port >> 8) & 0xff;
  out[ports + 1] = source.port & 0xff;
  out[ports + 2] = (destination.port >> 8) & 0xff;
  out[ports + 3] = destination.port & 0xff;
  return out;
}
