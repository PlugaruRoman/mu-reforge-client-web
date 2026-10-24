/**
 * The relay's abuse limits (proxy/readme.md, "Limits"): a token bucket per websocket for the frames
 * a browser sends, a cap on concurrent sockets per client address, and which peer may name that
 * address for us (nginx's `X-Real-IP`).
 *
 * Everything is a plain class or function with the clock injected, so the tests drive it without a
 * server; `main.ts` only wires it in.
 */

import { parseIp } from "./proxyProtocol";

type Env = Record<string, string | undefined>;

/** A non-negative number from the environment, or `fallback` when unset, empty or not a number. */
export function envNumber(env: Env, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Every limit the relay applies, with its environment variable and default. */
export interface RelayLimits {
  /** `WS_MAX_PAYLOAD`: largest frame a browser may send, bytes. A C2 packet is at most 65535. */
  maxPayloadLength: number;
  /** `WS_BACKPRESSURE_LIMIT`: bytes Bun may hold for one websocket that is not reading; then it is closed. */
  backpressureLimit: number;
  /** `WS_IDLE_TIMEOUT`: seconds without any frame or pong before Bun closes the websocket (0..960). */
  idleTimeout: number;
  /** `TCP_QUEUE_LIMIT`: bytes queued for one game-server socket that is not taking them; then both close. */
  tcpQueueLimit: number;
  /** `PRE_OPEN_LIMIT`: bytes a browser may send before the game-server socket is open; kept and sent on open. */
  preOpenLimit: number;
  /** `TCP_CONNECT_TIMEOUT`: seconds to wait for the game server to accept; then the websocket closes. */
  connectTimeoutSeconds: number;
  /** `CLIENT_MSG_RATE`: sustained frames per second from one browser (0 turns the bucket off). */
  messageRate: number;
  /** `CLIENT_MSG_BURST`: frames one browser may send at once above the rate. */
  messageBurst: number;
  /** `MAX_SOCKETS_PER_IP`: concurrent relay websockets per client address (0 = no cap). Matches nginx's `limit_conn mu_ws_conn 50` (ws.mureforge.com.conf), so a café behind one address is not refused here first; it is the backstop for whatever reaches Bun without nginx. */
  maxSocketsPerIp: number;
}

export function relayLimitsFromEnv(env: Env = process.env): RelayLimits {
  return {
    maxPayloadLength: envNumber(env, "WS_MAX_PAYLOAD", 65536),
    backpressureLimit: envNumber(env, "WS_BACKPRESSURE_LIMIT", 1024 * 1024),
    idleTimeout: Math.min(960, envNumber(env, "WS_IDLE_TIMEOUT", 120)),
    tcpQueueLimit: envNumber(env, "TCP_QUEUE_LIMIT", 1024 * 1024),
    preOpenLimit: envNumber(env, "PRE_OPEN_LIMIT", 64 * 1024),
    connectTimeoutSeconds: envNumber(env, "TCP_CONNECT_TIMEOUT", 10),
    messageRate: envNumber(env, "CLIENT_MSG_RATE", 100),
    messageBurst: envNumber(env, "CLIENT_MSG_BURST", 200),
    maxSocketsPerIp: envNumber(env, "MAX_SOCKETS_PER_IP", 50),
  };
}

/** Close codes the relay sends the browser when a limit ends the connection. */
export const CLOSE_POLICY = 1008;
export const CLOSE_TOO_BIG = 1009;
export const CLOSE_TRY_LATER = 1013;

/**
 * A token bucket: `burst` tokens, refilled at `rate` per second, one taken per frame. `take()`
 * false means the sender is over its budget. A rate of 0 never refuses.
 */
export class TokenBucket {
  private tokens: number;
  private last: number;

  constructor(
    private readonly rate: number,
    private readonly burst: number,
    private readonly now: () => number = () => performance.now()
  ) {
    this.tokens = Math.max(1, burst);
    this.last = now();
  }

  take(): boolean {
    if (this.rate <= 0) return true;
    const now = this.now();
    const capacity = Math.max(1, this.burst);
    this.tokens = Math.min(capacity, this.tokens + ((now - this.last) / 1000) * this.rate);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

/** Concurrent sockets per client address. `acquire` false = over the cap, nothing counted. */
export class IpSocketCounter {
  private readonly counts = new Map<string, number>();

  constructor(private readonly max: number) {}

  acquire(ip: string): boolean {
    const current = this.counts.get(ip) ?? 0;
    if (this.max > 0 && current >= this.max) return false;
    this.counts.set(ip, current + 1);
    return true;
  }

  release(ip: string): void {
    const current = this.counts.get(ip) ?? 0;
    if (current <= 1) this.counts.delete(ip);
    else this.counts.set(ip, current - 1);
  }

  count(ip: string): number {
    return this.counts.get(ip) ?? 0;
  }
}

/* ------------------------------------------------------------ client address */

interface TrustedRange {
  bytes: Uint8Array;
  prefix: number;
}

/**
 * `TRUSTED_PROXIES`: comma-separated addresses or CIDR ranges (`127.0.0.1`, `172.16.0.0/12`,
 * `::1`) whose `X-Real-IP` header is believed. Throws on an entry that is not one, so a typo
 * refuses to start rather than silently trusting nobody (or everybody).
 */
export function parseTrustedProxies(raw: string): TrustedRange[] {
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const [address, prefixText] = entry.split("/");
      const bytes = parseIp(address);
      if (!bytes) throw new Error(`TRUSTED_PROXIES: "${entry}" is not an IP address or CIDR range`);
      const max = bytes.length * 8;
      const prefix = prefixText === undefined ? max : Number(prefixText);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) {
        throw new Error(`TRUSTED_PROXIES: "${entry}" has a bad prefix length`);
      }
      return { bytes, prefix };
    });
}

export const DEFAULT_TRUSTED_PROXIES = "127.0.0.1,::1";

function inRange(address: Uint8Array, range: TrustedRange): boolean {
  if (address.length !== range.bytes.length) return false;
  let bits = range.prefix;
  for (let i = 0; bits > 0; i++, bits -= 8) {
    const mask = bits >= 8 ? 0xff : (0xff << (8 - bits)) & 0xff;
    if ((address[i] & mask) !== (range.bytes[i] & mask)) return false;
  }
  return true;
}

export function isTrustedProxy(ranges: TrustedRange[], peer: string): boolean {
  const bytes = parseIp(peer);
  return !!bytes && ranges.some(range => inRange(bytes, range));
}

/** `::ffff:1.2.3.4` as `1.2.3.4`; anything else as given, lower case. */
export function normalizeIp(ip: string): string {
  const lower = ip.trim().toLowerCase();
  return lower.startsWith("::ffff:") && lower.includes(".") ? lower.slice(7) : lower;
}

/**
 * Who the browser is: `X-Real-IP` when the socket peer is a trusted proxy (nginx on the host) and the
 * header holds a valid address, otherwise the socket peer itself. The port is the peer's only when the
 * address is the peer's - nginx does not pass the browser's port, so it is 0 then.
 */
export function resolveClientAddress(
  ranges: TrustedRange[],
  peer: { address: string; port: number } | null,
  realIpHeader: string | null
): { ip: string; port: number } {
  const peerIp = normalizeIp(peer?.address ?? "");
  if (peerIp && isTrustedProxy(ranges, peerIp) && realIpHeader) {
    const claimed = normalizeIp(realIpHeader);
    if (parseIp(claimed)) return { ip: claimed, port: 0 };
  }
  return { ip: peerIp || "unknown", port: peer?.port ?? 0 };
}
