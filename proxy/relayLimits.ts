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

/**
 * Every limit the relay applies, with its environment variable and default.
 *
 * Memory: the application buffers one relay socket can pin are at most
 * `backpressureLimit + tcpQueueLimit + preOpenLimit` = 512 + 256 + 16 KiB = 784 KiB with the
 * defaults (the pre-open buffer and the TCP queue are one queue at different times, so this
 * overcounts a little), plus the kernel's socket buffers, which cgroup v2 charges to the
 * container. `maxSocketsTotal` x that is the worst case the container's memory cap must hold;
 * deploy/reforge/compose.yml (PROXY_MEM) shows the arithmetic.
 */
export interface RelayLimits {
  /**
   * `WS_MAX_PAYLOAD`: largest frame a browser may send, bytes. The web client sends one game packet
   * per frame (Session.sendToGS), and its largest is a letter (LetterSendRequest, C4: 84 bytes +
   * up to 1000 characters, src/modules/friends/messenger.ts) - about 1.5 KB after SimpleModulus
   * grows it by 11/8, and under 6 KB even if every character took 3 bytes. Chat and whispers are
   * under 100 bytes, fixed packets at most 261. 16 KiB keeps a wide margin; a C2/C4 can be 65535,
   * which only a forged stream sends.
   */
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
  /**
   * `CLIENT_BYTE_RATE`: sustained bytes per second from one browser (0 turns the bucket off). The
   * frame bucket alone let one socket push rate x WS_MAX_PAYLOAD a second; a real client sends a
   * few KB/s (walk, attack, skill and ping packets of 5-60 bytes), so 32 KiB/s is a backstop.
   */
  byteRate: number;
  /** `CLIENT_BYTE_BURST`: bytes one browser may send at once above the rate; never below `maxPayloadLength`. */
  byteBurst: number;
  /** `MAX_SOCKETS_PER_IP`: concurrent relay websockets per client address (0 = no cap). Matches nginx's `limit_conn mu_ws_conn 30` (ws.mureforge.com.conf), so a café behind one address is not refused here first; it is the backstop for whatever reaches Bun without nginx. */
  maxSocketsPerIp: number;
  /**
   * `MAX_SOCKETS_TOTAL`: concurrent relay websockets of all addresses together (0 = no cap). The
   * backstop to nginx's `limit_conn mu_ws_total 2000`: past it a new socket is refused with 503,
   * so the memory worst case stays `maxSocketsTotal` x the per-socket buffers above.
   */
  maxSocketsTotal: number;
}

export function relayLimitsFromEnv(env: Env = process.env): RelayLimits {
  const maxPayloadLength = envNumber(env, "WS_MAX_PAYLOAD", 16 * 1024);
  return {
    maxPayloadLength,
    backpressureLimit: envNumber(env, "WS_BACKPRESSURE_LIMIT", 512 * 1024),
    idleTimeout: Math.min(960, envNumber(env, "WS_IDLE_TIMEOUT", 120)),
    tcpQueueLimit: envNumber(env, "TCP_QUEUE_LIMIT", 256 * 1024),
    preOpenLimit: envNumber(env, "PRE_OPEN_LIMIT", 16 * 1024),
    connectTimeoutSeconds: envNumber(env, "TCP_CONNECT_TIMEOUT", 10),
    messageRate: envNumber(env, "CLIENT_MSG_RATE", 60),
    messageBurst: envNumber(env, "CLIENT_MSG_BURST", 200),
    byteRate: envNumber(env, "CLIENT_BYTE_RATE", 32 * 1024),
    // A burst below one maximal frame would refuse that frame forever, however slowly it came.
    byteBurst: Math.max(maxPayloadLength, envNumber(env, "CLIENT_BYTE_BURST", 256 * 1024)),
    maxSocketsPerIp: envNumber(env, "MAX_SOCKETS_PER_IP", 30),
    maxSocketsTotal: envNumber(env, "MAX_SOCKETS_TOTAL", 2000),
  };
}

/** Close codes the relay sends the browser when a limit ends the connection. */
export const CLOSE_POLICY = 1008;
export const CLOSE_TOO_BIG = 1009;
export const CLOSE_TRY_LATER = 1013;

/**
 * A token bucket: `burst` tokens, refilled at `rate` per second, `cost` taken per call (1 for the
 * frame bucket, the frame's size for the byte bucket). `take()` false means the sender is over its
 * budget, and nothing was taken. A rate of 0 never refuses.
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

  take(cost = 1): boolean {
    if (this.rate <= 0) return true;
    const now = this.now();
    const capacity = Math.max(1, this.burst);
    this.tokens = Math.min(capacity, this.tokens + ((now - this.last) / 1000) * this.rate);
    this.last = now;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}

/** Which cap refused a socket: the address's own, or the one for all addresses together. */
export type SocketRefusal = "ip" | "total";

/**
 * Concurrent sockets per client address and in total. `tryAcquire` null = counted, otherwise the
 * cap that refused it (nothing counted then). Every counted socket is released exactly once.
 */
export class IpSocketCounter {
  private readonly counts = new Map<string, number>();
  private open = 0;

  constructor(
    private readonly max: number,
    private readonly maxTotal = 0
  ) {}

  tryAcquire(ip: string): SocketRefusal | null {
    if (this.maxTotal > 0 && this.open >= this.maxTotal) return "total";
    const current = this.counts.get(ip) ?? 0;
    if (this.max > 0 && current >= this.max) return "ip";
    this.counts.set(ip, current + 1);
    this.open++;
    return null;
  }

  acquire(ip: string): boolean {
    return this.tryAcquire(ip) === null;
  }

  release(ip: string): void {
    const current = this.counts.get(ip) ?? 0;
    // A release with nothing counted must not free a slot of the total for somebody else.
    if (current <= 0) return;
    if (current === 1) this.counts.delete(ip);
    else this.counts.set(ip, current - 1);
    this.open--;
  }

  /** Sockets counted for all addresses together. */
  get total(): number {
    return this.open;
  }

  count(ip: string): number {
    return this.counts.get(ip) ?? 0;
  }
}

/**
 * The span between counting a socket (`tryAcquire`, already done for `ip`) and the websocket's own
 * `close` taking over its release. `upgrade` builds the socket's state and upgrades; only `true`
 * hands the slot on. `false` or a throw releases the slot and runs `undo` (for whatever `upgrade`
 * had built) before the result or the error goes back - without this an exception in that span
 * kept the address's count, and the total's, up for the life of the process.
 */
export function upgradeHoldingSlot(
  counter: IpSocketCounter,
  ip: string,
  upgrade: () => boolean,
  undo: () => void = () => {}
): boolean {
  let upgraded = false;
  try {
    upgraded = upgrade();
    return upgraded;
  } finally {
    if (!upgraded) {
      try {
        undo();
      } finally {
        counter.release(ip);
      }
    }
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
