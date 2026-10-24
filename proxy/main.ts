import type { Server, ServerWebSocket, Socket } from "bun";
import { CLEAR, currentWeather, weatherForced, weatherPacket, weatherSlotSeconds, type WeatherState } from "./weather";
import { ConnectionPresence, PRESENCE_HOST, PRESENCE_PORT, startPresenceServer } from "./presence";
import { allowTargetsFromEnv, targetAllowed, type ReservedTarget } from "./allowTargets";
import { SESSION_NONCE_RE } from "../src/controllers/net/sessionNonce";
import { ADMIN_STREAM_PATH, type RefusalReason } from "../src/controllers/net/protocols/adminProtocol";
import { Tracker } from "./track/tracker";
import type { TrackedSession } from "./track/session";
import { AdminHub, type AdminSocket } from "./track/admin";
import { MemoryJournal, type Journal } from "./track/journal";
import { DEFAULT_TRACK_DB, SqliteJournal } from "./track/store";
import { startDemo } from "./track/demo";
import { BandHub, type BandPeer } from "./band/hub";
import { routeClientFrame } from "./clientFrames";
import { PingHub, type PingPeer } from "./ping/hub";
import { SERVER_MANIFEST_PATH, serverManifestResponse } from "./serverManifest";
import {
  CLOSE_POLICY,
  CLOSE_TRY_LATER,
  DEFAULT_TRUSTED_PROXIES,
  IpSocketCounter,
  parseTrustedProxies,
  relayLimitsFromEnv,
  resolveClientAddress,
  TokenBucket,
} from "./relayLimits";
import { RelayPipe, type TcpEnd } from "./relayPipe";
import { proxyProtocolFromEnv, proxyV2Header, type ProxyProtocolMode } from "./proxyProtocol";

const PORT = process.env.PORT || "3000";
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

/**
 * Weather broadcast (see weather.ts).
 *
 * OpenMU never sends `WeatherStatusUpdate`, so the proxy synthesises it. This
 * is the only place in the pipe that *originates* a packet rather than
 * forwarding one - everything else here is a byte copy - so it is kept to one
 * timer and one 4-byte frame.
 *
 * The state is global, not per connection: every client must see the same sky,
 * which is the whole reason this lives in the proxy instead of in each client.
 */
const WEATHER_ENABLED = (process.env.WEATHER ?? "on") !== "off";

/** How often the schedule is sampled. The client eases between the steps. */
const WEATHER_TICK_MS = Number(process.env.WEATHER_TICK ?? 5000);

/**
 * Resend even when nothing changed, so a steady sky is self-healing: a client
 * that connects mid-shower is told, and one that missed a frame is corrected
 * within the interval rather than holding the wrong weather until the next
 * change - which, on a soaked day, can be hours away.
 */
const WEATHER_HEARTBEAT_MS = Number(process.env.WEATHER_HEARTBEAT ?? 20000);

/**
 * Which servers this proxy is allowed to dial (see allowTargets.ts). Unset means
 * any host the client asks for, which is what a local dev box wants; a proxy on
 * the internet must be pinned to the game ports, or it is an open relay - and an
 * internal target (127.0.0.1 and the like) must be pinned to an exact port, or a
 * bare-host rule turns the relay into a way to reach every loopback service on
 * the box, e.g. `ALLOW_TARGETS="127.0.0.1:44405,127.0.0.1:55901"`.
 */
const ALLOW = allowTargetsFromEnv(process.env.ALLOW_TARGETS, process.env.NODE_ENV === "production");
if ("error" in ALLOW) {
  console.error(ALLOW.error);
  process.exit(1);
}
const ALLOW_RULES = ALLOW.rules;

/**
 * The relay's limits (relayLimits.ts, proxy/readme.md "Limits"): websocket payload, backpressure and
 * idle settings, the TCP queue, the frame rate per browser and the sockets per client address.
 */
const LIMITS = relayLimitsFromEnv();

/** Startup settings that must parse or the proxy does not start (a typo is not "off"). */
function required<T>(read: () => T): T {
  try {
    return read();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * `TRUSTED_PROXIES`: the peers whose `X-Real-IP` names the browser (nginx in front). Anyone else's
 * header is ignored and the socket peer is the client. The container image adds the docker bridge
 * range, which is where nginx on the host appears from.
 */
const TRUSTED_PROXIES = required(() => parseTrustedProxies(process.env.TRUSTED_PROXIES ?? DEFAULT_TRUSTED_PROXIES));

/**
 * `PROXY_PROTOCOL=v2` writes a PROXY v2 header (proxyProtocol.ts) as the first bytes of every
 * game-server connection, carrying the browser's address. Only for a game server that expects it
 * from this proxy: one that does not reads the header as a broken packet and drops the player.
 */
const PROXY_PROTOCOL: ProxyProtocolMode = required(() => proxyProtocolFromEnv(process.env.PROXY_PROTOCOL));

const ipSockets = new IpSocketCounter(LIMITS.maxSocketsPerIp);

/**
 * Where the presence server listens - the same variables and defaults
 * `presence.ts` binds with. Named here so the relay can refuse to dial it
 * (`targetReserved` in allowTargets.ts says why), which has to hold with
 * `ALLOW_TARGETS` unset: that is the one setting a dev box runs with, and a
 * dev box is one forgotten variable away from being the public one.
 */
const RESERVED_TARGETS: ReservedTarget[] = [
  { host: PRESENCE_HOST, port: PRESENCE_PORT },
];

/**
 * The tracker (documentation/admin_console/ARCHITECTURE.md): every session's
 * live state and journal, streamed to a game master's panel on
 * `/admin/stream`. `TRACK=off` removes it whole - no decoding, no journal,
 * and the stream refuses everyone. `TRACK_DB_PATH=memory` keeps the journal
 * in memory for the life of the process.
 */
const TRACK_ENABLED = (process.env.TRACK ?? "on") !== "off";
const TRACK_DB_PATH = process.env.TRACK_DB_PATH || DEFAULT_TRACK_DB;
const TRACK_RETAIN_DAYS = Number(process.env.TRACK_RETAIN_DAYS ?? 30);
const TRACK_WHISPERS = (process.env.TRACK_WHISPERS ?? "on") !== "off";

/**
 * The band relay (documentation/band/ARCHITECTURE.md): instrument frames
 * (`C1 .. FA`) never reach the game server while it is on; they are validated and relayed
 * here to the sockets whose character can see the performer, which is what
 * the tracker knows. `BAND=off` passes them to the game server (Mu Reforge's
 * Item Collections is C1 FA, clientFrames.ts). Needs `TRACK` on.
 */
const BAND_ENABLED = (process.env.BAND ?? "on") !== "off";
const BAND_MAX_PERFORMERS = Number(process.env.BAND_MAX_PERFORMERS ?? 16);
const BAND_MAX_RECEIVERS = Number(process.env.BAND_MAX_RECEIVERS ?? 48);

/**
 * The map ping relay (documentation/ping/ARCHITECTURE.md): pointer frames
 * (`C1 .. FB`) never reach the game server either; each is relayed to the
 * sockets whose character can see the sender. `PING=off` swallows them.
 * Needs `TRACK` on, same as the band.
 */
const PING_ENABLED = (process.env.PING ?? "on") !== "off";
const PING_MAX_RECEIVERS = Number(process.env.PING_MAX_RECEIVERS ?? 48);

/**
 * Dev seams for the panel, both loud at startup and neither for a public
 * proxy: `ADMIN_OPEN=on` lets a loopback client stream without a game master
 * socket (the offline client has no login to vouch for), `ADMIN_DEMO=on`
 * fills the tracker with synthetic players. `ADMIN_ORIGINS` is a
 * comma-separated allowlist of browser origins for the stream; unset allows
 * any, which the nonce check already makes safe.
 */
const ADMIN_OPEN = process.env.ADMIN_OPEN === "on";
const ADMIN_DEMO = process.env.ADMIN_DEMO === "on";
const ADMIN_ORIGINS = (process.env.ADMIN_ORIGINS ?? "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

if (!ALLOW_RULES.length) {
  console.warn(
    "ALLOW_TARGETS is unset: this proxy will dial ANY host:port a client names (bar the presence server). Fine on localhost, an open relay in public - set it to the game ports, e.g. ALLOW_TARGETS=127.0.0.1:44405,127.0.0.1:55901"
  );
} else {
  console.log(
    `allowed targets: ${ALLOW_RULES.map(r => (r.port === null ? r.host : `${r.host}:${r.port}`)).join(", ")}`
  );
}

/** The per-packet hex dump. Priceless locally, far too loud against a real server. */
const LOG_PACKETS = (process.env.LOG_PACKETS ?? "on") !== "off";

console.log(
  `limits: payload ${LIMITS.maxPayloadLength} B, ws backpressure ${LIMITS.backpressureLimit} B, idle ${LIMITS.idleTimeout} s, ` +
    `tcp queue ${LIMITS.tcpQueueLimit} B, pre-open ${LIMITS.preOpenLimit} B, connect ${LIMITS.connectTimeoutSeconds} s, ` +
    `${LIMITS.messageRate || "unlimited"} frames/s (burst ${LIMITS.messageBurst}), ${LIMITS.maxSocketsPerIp || "unlimited"} sockets/ip; ` +
    `proxy protocol ${PROXY_PROTOCOL}`
);

type RelayData = {
  kind: "relay";
  targetHost: string;
  targetPort: number;
  /** The browser's address (X-Real-IP from a trusted proxy, else the socket peer); logged, never the packets. */
  clientIp: string;
  /** The browser's port when known (0 behind nginx), for the PROXY header. */
  clientPort: number;
  /** The byte pipe to the game server; made in `open`. */
  pipe: RelayPipe | null;
  /** Frames this browser may still send (CLIENT_MSG_RATE / CLIENT_MSG_BURST). */
  bucket: TokenBucket;
  connectTimer: ReturnType<typeof setTimeout> | null;
  /** Why the proxy itself closed the websocket, for the close log line. */
  closeNote: string | null;
  presence: ConnectionPresence;
  track: TrackedSession | null;
  /** This socket as the band relay knows it; set in `open`, null without tracking. */
  band: BandPeer | null;
  /** This socket as the ping relay knows it; set in `open`, null without tracking. */
  ping: PingPeer | null;
};

type AdminData = {
  kind: "admin";
  /** Set when the upgrade was accepted only to say why it is refused. */
  refused: RefusalReason | null;
  socket: AdminSocket | null;
};

type WebSocketData = RelayData | AdminData;

const clients = new Set<ServerWebSocket<RelayData>>();

let weather: WeatherState = CLEAR;
let lastBroadcast = 0;

function sendWeather(ws: ServerWebSocket<RelayData>, state: WeatherState) {
  ws.send(weatherPacket(state));
}

function tickWeather() {
  const now = Date.now();
  const next = currentWeather(now);
  const changed = next.kind !== weather.kind || next.variation !== weather.variation;

  if (changed) {
    console.log(
      `weather: ${next.kind === 0 ? "clear" : `rain ${next.variation}/15`}`
    );
  }

  weather = next;

  if (!changed && now - lastBroadcast < WEATHER_HEARTBEAT_MS) return;

  lastBroadcast = now;
  for (const ws of clients) sendWeather(ws, weather);
}

if (WEATHER_ENABLED) {
  weather = currentWeather(Date.now());
  setInterval(tickWeather, WEATHER_TICK_MS);
  console.log(
    weatherForced
      ? `weather: FORCED to ${weather.kind === 0 ? "clear" : `rain ${weather.variation}/15`} (WEATHER_FORCE)`
      : `weather: on (slot ${weatherSlotSeconds}s, tick ${WEATHER_TICK_MS}ms) - WEATHER_FORCE=12 to pin rain, WEATHER=off to disable`
  );
} else {
  console.log("weather: off");
}

function byteToString(i: number) {
  return i.toString(16).padStart(2, "0").toUpperCase();
}

// like 'C1 04 00 01'
function stringifyPacket(buffer: string | ArrayLike<number>) {
  if (typeof buffer === "string") return buffer;
  return Array.from(buffer).map(byteToString).join(" ");
}

// Bun hands us Node Buffers; re-view them as plain Uint8Arrays (no copy) so
// they match the `string | BufferSource` signatures on ws.send / socket.write.
function asBufferSource(data: string | Buffer): string | Uint8Array {
  return typeof data === "string"
    ? data
    : new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
}

/** Bun's TCP socket as the pipe drives it; `pause`/`resume` exist at runtime but not in bun-types 1.4. */
function tcpEnd(socket: Socket): TcpEnd {
  const flow = socket as unknown as { pause(): void; resume(): void };
  return {
    write: bytes => socket.write(bytes),
    flush: () => socket.flush(),
    end: () => socket.end(),
    pause: () => flow.pause(),
    resume: () => flow.resume(),
  };
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function isLoopback(server: Server, req: Request): boolean {
  const address = server.requestIP(req)?.address ?? "";
  return LOOPBACK.has(address);
}

/* --------------------------------------------------------------- tracker */

let tracker: Tracker | null = null;
let journal: Journal | null = null;
let hub: AdminHub | null = null;

/**
 * A journal that cannot open (a read-only home, a missing sqlite build) must
 * never keep the proxy from starting: that would drop every player over a
 * log file. It falls back to memory and says so.
 */
function openJournal(): { journal: Journal; where: string } {
  if (TRACK_DB_PATH === "memory") return { journal: new MemoryJournal(), where: "in memory" };
  try {
    return { journal: new SqliteJournal(TRACK_DB_PATH, TRACK_RETAIN_DAYS), where: TRACK_DB_PATH };
  } catch (error) {
    console.error(`track: cannot open the journal at ${TRACK_DB_PATH}, keeping it in memory:`, error);
    return { journal: new MemoryJournal(), where: "in memory (fallback)" };
  }
}

if (TRACK_ENABLED) {
  tracker = new Tracker({ whispers: TRACK_WHISPERS });
  const opened = openJournal();
  journal = opened.journal;
  const store = journal;
  tracker.subscribe({ event: (_id, event) => store.append(event) });
  hub = new AdminHub(tracker, journal, { open: ADMIN_OPEN });

  console.log(
    `track: on (journal ${opened.where}, ${TRACK_RETAIN_DAYS} days, whispers ${TRACK_WHISPERS ? "on" : "off"}) - admin stream on ${ADMIN_STREAM_PATH}`
  );
  if (ADMIN_OPEN) console.warn("ADMIN_OPEN=on: loopback clients may stream without a game master socket");
  if (ADMIN_DEMO) startDemo(tracker);
} else {
  console.log("track: off");
}

/* ------------------------------------------------------------------ band */

let band: BandHub | null = null;

if (BAND_ENABLED && tracker) {
  band = new BandHub({
    maxPerformers: BAND_MAX_PERFORMERS,
    maxReceivers: BAND_MAX_RECEIVERS,
    log: line => console.log(line),
  });
  const hub = band;
  setInterval(() => hub.sweep(), 5000);

  // A stats line a minute, only when something happened.
  let last = JSON.stringify(hub.stats());
  setInterval(() => {
    const stats = hub.stats();
    const line = JSON.stringify(stats);
    if (line !== last) {
      last = line;
      console.log(`band: ${line}`);
    }
  }, 60_000);

  console.log(
    `band: on (max ${BAND_MAX_PERFORMERS} performers, ${BAND_MAX_RECEIVERS} receivers each) - BAND=off to disable`
  );
} else if (BAND_ENABLED) {
  console.warn("band: off (TRACK=off - the relay needs the tracker's scope to know who hears whom)");
} else {
  console.log("band: off");
}

/* ------------------------------------------------------------------ ping */

let ping: PingHub | null = null;

if (PING_ENABLED && tracker) {
  ping = new PingHub({
    maxReceivers: PING_MAX_RECEIVERS,
    log: line => console.log(line),
  });
  const hub = ping;

  // A stats line a minute, only when something happened.
  let last = JSON.stringify(hub.stats());
  setInterval(() => {
    const stats = hub.stats();
    const line = JSON.stringify(stats);
    if (line !== last) {
      last = line;
      console.log(`ping: ${line}`);
    }
  }, 60_000);

  console.log(`ping: on (max ${PING_MAX_RECEIVERS} receivers) - PING=off to disable`);
} else if (PING_ENABLED) {
  console.warn("ping: off (TRACK=off - the relay needs the tracker's scope to know who sees whom)");
} else {
  console.log("ping: off");
}

startPresenceServer();

Bun.serve<WebSocketData>({
  port: PORT,
  hostname: HOSTNAME,
  fetch(req, server) {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    if (url.pathname === SERVER_MANIFEST_PATH && req.method === "GET") return serverManifestResponse();

    if (url.pathname === ADMIN_STREAM_PATH) {
      if (!hub) return new Response("tracking is off", { status: 404 });

      const origin = (req.headers.get("origin") ?? "").toLowerCase();
      const rawSession = searchParams.get("session") ?? "";
      const session = SESSION_NONCE_RE.test(rawSession) ? rawSession : null;

      let refused: RefusalReason | null = null;
      if (ADMIN_ORIGINS.length && !ADMIN_ORIGINS.includes(origin)) refused = "origin";
      else {
        const auth = hub.authorise(session, isLoopback(server, req));
        if (auth !== "ok") refused = auth;
      }

      // Refused requests are still upgraded, so the panel can be told why
      // before the close: a plain 403 reaches a browser websocket as an
      // error with no body.
      if (server.upgrade(req, { data: { kind: "admin", refused, socket: null } satisfies AdminData })) {
        return;
      }
      return new Response("Upgrade failed :(", { status: 500 });
    }

    const targetHost = searchParams.get("host")?.trim().toLowerCase() ?? "";
    const targetPort = parseInt(searchParams.get("port") ?? "0");

    // Refuse here rather than in `open`: a bad target used to upgrade and then
    // fail inside Bun.connect, which the client sees as a socket that closed
    // for no reason.
    if (!targetHost || !(targetPort > 0 && targetPort <= 65535)) {
      return new Response("host and port query parameters are required", {
        status: 400,
      });
    }

    if (!targetAllowed(ALLOW_RULES, targetHost, targetPort, RESERVED_TARGETS)) {
      console.warn(`refused target ${targetHost}:${targetPort}`);
      return new Response("target not allowed", { status: 403 });
    }

    // The page's session nonce (src/controllers/net/sessionNonce.ts), which lets the
    // cash shop put an account to this socket through the presence server's
    // /ticket/<nonce>. Absent or malformed is not a refusal: it only means
    // this socket can never be named by ticket, and the game must connect
    // with a broken shop. It is a bearer credential and is never logged.
    const rawSession = searchParams.get("session") ?? "";
    const session = SESSION_NONCE_RE.test(rawSession) ? rawSession : null;

    // Built before the upgrade is known to have happened, so a request that
    // turns out not to be a websocket handshake has to close it: otherwise it
    // sits in the presence registry, and with a nonce in the ticket map, for
    // the life of the process.
    // Who this is, for the per-address cap, the logs and the PROXY header. Counted before the
    // upgrade and released in `close` (or right below when the upgrade fails).
    const client = resolveClientAddress(TRUSTED_PROXIES, server.requestIP(req), req.headers.get("x-real-ip"));
    if (!ipSockets.acquire(client.ip)) {
      console.warn(`refused ip=${client.ip}: ${ipSockets.count(client.ip)} sockets open (MAX_SOCKETS_PER_IP)`);
      return new Response("too many connections", { status: 429 });
    }

    const presence = new ConnectionPresence(session, targetPort);
    const track = tracker ? tracker.open(session, targetPort) : null;

    const data: RelayData = {
      kind: "relay",
      targetHost,
      targetPort,
      clientIp: client.ip,
      clientPort: client.port,
      pipe: null,
      bucket: new TokenBucket(LIMITS.messageRate, LIMITS.messageBurst),
      connectTimer: null,
      closeNote: null,
      presence,
      track,
      band: null,
      ping: null,
    };

    // upgrade the request to a WebSocket
    if (server.upgrade(req, { data })) {
      return; // do not return a Response
    }

    ipSockets.release(client.ip);
    presence.close();
    if (track) tracker?.close(track);
    return new Response("Upgrade failed :(", { status: 500 });
  },
  websocket: {
    // A browser frame is one game packet (a C2 is at most 65535 bytes). Bun holds at most
    // `backpressureLimit` for a socket that is not reading and closes it past that, instead of the
    // 16 MB per socket default that let a few non-reading sockets run the container out of memory.
    maxPayloadLength: LIMITS.maxPayloadLength,
    backpressureLimit: LIMITS.backpressureLimit,
    closeOnBackpressureLimit: true,
    idleTimeout: LIMITS.idleTimeout,
    // Pings keep a background tab (throttled timers) alive and find dead peers within idleTimeout.
    sendPings: true,
    open(ws) {
      if (ws.data.kind === "admin") {
        const data = ws.data;
        if (data.refused || !hub) {
          ws.send(AdminHub.refusal(data.refused ?? "no-session"));
          ws.close();
          return;
        }
        data.socket = { send: text => ws.send(text), close: () => ws.close() };
        hub.attach(data.socket);
        return;
      }

      const relay = ws as ServerWebSocket<RelayData>;

      const who = `ip=${relay.data.clientIp} target=${relay.data.targetHost}:${relay.data.targetPort}`;
      console.log(`client connected ${who}`);

      const pipe = new RelayPipe(
        { send: bytes => relay.send(bytes), close: (code, reason) => relay.close(code, reason) },
        LIMITS,
        reason => console.warn(`relay ${who}: closing, ${reason}`)
      );
      relay.data.pipe = pipe;

      if (WEATHER_ENABLED) {
        clients.add(relay);
        // The heartbeat would reach them within 20 s anyway, but a player who
        // logs into a downpour should not walk through the first seconds of it
        // under a clear sky.
        sendWeather(relay, weather);
      }

      // The relay needs the ws to send with, so the peer is made here rather
      // than in fetch. The hello tells the client instruments work on this
      // connection; a client that never gets one keeps them off.
      if (band && relay.data.track) {
        const peer: BandPeer = { track: relay.data.track, send: frame => relay.send(frame) };
        relay.data.band = peer;
        band.attach(peer);
        relay.send(BandHub.hello());
      }

      if (ping && relay.data.track) {
        const peer: PingPeer = { track: relay.data.track, send: frame => relay.send(frame) };
        relay.data.ping = peer;
        ping.attach(peer);
        relay.send(PingHub.hello());
      }

      // Connect to TCP server. A server that never answers must not keep the browser waiting
      // (nor hold a slot here): past TCP_CONNECT_TIMEOUT the websocket closes, and a socket that
      // still opens afterwards is ended by the pipe.
      relay.data.connectTimer = setTimeout(() => {
        relay.data.connectTimer = null;
        if (pipe.open || pipe.closed) return;
        console.warn(`tcp connect timeout ${who}`);
        relay.data.closeNote = "connect timeout";
        relay.close(CLOSE_TRY_LATER, "game server did not answer");
      }, LIMITS.connectTimeoutSeconds * 1000);

      const stopConnectTimer = () => {
        if (relay.data.connectTimer) clearTimeout(relay.data.connectTimer);
        relay.data.connectTimer = null;
      };

      Bun.connect({
        hostname: relay.data.targetHost,
        port: relay.data.targetPort,
        socket: {
          data(socket, data) {
            if (pipe.closed) {
              socket.end();
              return;
            }
            if (LOG_PACKETS) console.log("data from tcp:", stringifyPacket(data));

            const forwarded = asBufferSource(data);
            const bytes = typeof forwarded === "string" ? new TextEncoder().encode(forwarded) : forwarded;

            if (!pipe.fromServer(bytes)) return;

            // The server's side of the login: the sniffer names a socket only
            // once the game server has said yes, never off the client's own
            // claim. Same copy discipline as the other direction.
            const copy = new Uint8Array(bytes);
            const confirmed = relay.data.presence.feedFromServer(copy);
            const track = relay.data.track;
            if (track) {
              if (confirmed) track.setAccount(confirmed);
              track.feedServer(copy);
            }
          },
          open(socket) {
            stopConnectTimer();
            let header: Uint8Array | undefined;
            if (PROXY_PROTOCOL === "v2" && !pipe.closed) {
              try {
                header = proxyV2Header(
                  { ip: relay.data.clientIp, port: relay.data.clientPort },
                  { ip: socket.remoteAddress, port: relay.data.targetPort }
                );
              } catch (error) {
                // Without the header a server that expects it would read the game bytes as one;
                // better no connection than a wrong address.
                console.error(`proxy protocol ${who}:`, error instanceof Error ? error.message : error);
                socket.end();
                pipe.serverClosed();
                return;
              }
            }
            pipe.tcpOpened(tcpEnd(socket), header);
          },
          close() {
            stopConnectTimer();
            pipe.serverClosed();
          },
          drain() {
            pipe.tcpDrain();
          },
          error(_socket, error) {
            console.log(`tcp error ${who}:`, error);
            pipe.serverClosed();
          },

          // client-specific handlers
          connectError(_socket, error) {
            stopConnectTimer();
            console.log(`tcp connect error ${who}:`, error);
            // Tell the client now. Left open, the ws just sits there and the
            // player waits on a game server that was never reached - which is
            // also what the client's address fallback keys off.
            pipe.serverClosed();
          }, // connection failed
          end() {
            pipe.serverClosed();
          }, // connection closed by server
          timeout() { }, // connection timed out
        },
      }).catch(() => {
        // connectError above has already handled (and logged) it.
      });
    },
    message(ws, message) {
      if (ws.data.kind === "admin") {
        if (ws.data.socket && hub && typeof message === "string") hub.receive(ws.data.socket, message);
        return;
      }

      const relay = ws as ServerWebSocket<RelayData>;

      // A backstop against a scripted client, well above what the game sends (walk, attack and
      // skill frames, plus the burst at login and on map change); the game server has its own.
      if (!relay.data.bucket.take()) {
        console.warn(`rate limit ip=${relay.data.clientIp}: over ${LIMITS.messageRate} frames/s, closing`);
        relay.data.closeNote = "rate limit";
        relay.close(CLOSE_POLICY, "too many frames");
        return;
      }

      // A band frame is the proxy's while `BAND` is on (relayed, or swallowed
      // without the tracker); with `BAND=off` C1 FA goes to the game server
      // (Mu Reforge's Item Collections, clientFrames.ts). A ping frame is always
      // the proxy's. Both before the log and the write, never shown to the sniffers.
      if (typeof message !== "string") {
        const bytes = asBufferSource(message) as Uint8Array;
        const route = routeClientFrame(bytes, BAND_ENABLED);
        if (route === "band") {
          if (band && relay.data.band) band.receive(relay.data.band, bytes);
          return;
        }
        if (route === "ping") {
          if (ping && relay.data.ping) ping.receive(relay.data.ping, bytes);
          return;
        }
      }

      const pipe = relay.data.pipe;
      if (!pipe || pipe.closed) return;

      if (LOG_PACKETS) console.log("data from ws:", stringifyPacket(message));

      const forwarded = asBufferSource(message);
      const bytes = typeof forwarded === "string" ? new TextEncoder().encode(forwarded) : forwarded;

      // Written now, or queued (in order) until the socket opens or drains; the pipe closes both
      // ends when a queue passes its limit rather than dropping bytes out of the stream.
      pipe.fromClient(bytes);
      if (pipe.closed) return;

      // After the write, and on its own copy: the sniffer decrypts in place
      // and must never touch what goes to the game server.
      if (typeof forwarded !== "string") {
        const copy = new Uint8Array(forwarded);
        relay.data.presence.feed(copy);
        relay.data.track?.feedClient(copy);
      }
    },
    drain(ws) {
      if (ws.data.kind === "relay") ws.data.pipe?.wsDrain();
    },
    close(ws, code) {
      if (ws.data.kind === "admin") {
        if (ws.data.socket && hub) hub.detach(ws.data.socket);
        return;
      }

      const relay = ws as ServerWebSocket<RelayData>;
      clients.delete(relay);
      relay.data.presence.close();
      // Before the tracker closes the session: the gone / leave notices
      // still need its map and scope.
      if (relay.data.band) band?.detach(relay.data.band);
      if (relay.data.ping) ping?.detach(relay.data.ping);
      if (relay.data.track) tracker?.close(relay.data.track);

      if (relay.data.connectTimer) clearTimeout(relay.data.connectTimer);
      relay.data.connectTimer = null;

      const pipe = relay.data.pipe;
      // Ends the TCP socket, or marks the pipe closed so a socket still connecting is ended on open.
      pipe?.clientClosed();
      ipSockets.release(relay.data.clientIp);

      const reason = relay.data.closeNote ?? pipe?.reason ?? "client closed";
      console.log(
        `client closed ip=${relay.data.clientIp} target=${relay.data.targetHost}:${relay.data.targetPort} code=${code} (${reason})`
      );
    },
  },
});

console.log(`Listening...`);
