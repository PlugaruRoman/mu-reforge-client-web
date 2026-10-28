# syntax=docker/dockerfile:1.7
#
# The WebSocket <-> TCP proxy (proxy/main.ts) for the Mu Reforge web client. Same recipe as the
# installer's services image (install/stack/services.Dockerfile), reduced to the proxy.
#
# Built in CI (.github/workflows/reforge-images.yml). Build context = repository root:
#
#   docker build -f deploy/reforge/proxy.Dockerfile -t mu-reforge-proxy:local .
#
# Every setting is an environment variable (proxy.env on the box, see proxy.env.example).
# The defaults below are the SAFE ones, so a container started without its env file is still
# not an open relay with packet dumps: it refuses to start without PROXY_TARGETS or ALLOW_TARGETS
# (entry check).

FROM oven/bun:1.4.2-slim
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

COPY tsconfig.json index.d.ts ./
COPY proxy ./proxy
COPY src ./src
COPY versions ./versions
COPY tools/sqliteMigrate.ts ./tools/sqliteMigrate.ts

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LOG_PACKETS=off \
    TRACK=off \
    TRACK_DB_PATH=memory \
    ADMIN_OPEN=off \
    ADMIN_DEMO=off \
    BAND=off \
    PING=off \
    PRESENCE=off \
    PRESENCE_HOST=127.0.0.1 \
    PROXY_PROTOCOL=off \
    TRUSTED_PROXIES=127.0.0.1,::1,172.31.250.1 \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=0

# TRUSTED_PROXIES: nginx on the host reaches the container through the gateway of the compose
# network, which compose.yml pins to 172.31.250.0/24 with gateway 172.31.250.1, so X-Real-IP is
# believed from that ONE address (plus loopback) - not from the web container on the same network,
# nor from any other bridge. Without it every web player would be "172.31.250.1" to the
# per-address cap (MAX_SOCKETS_PER_IP) and the logs; runbook.md W9 checks that the log shows real
# addresses. Nothing else can reach port 3000 (compose publishes it on the host's 127.0.0.1 only).
# PROXY_PROTOCOL stays off until the game servers accept PROXY v2 from this box (proxy/readme.md).
#
# The relay's limits default in code (proxy/relayLimits.ts) and need no entry here:
# WS_MAX_PAYLOAD 16384, WS_BACKPRESSURE_LIMIT 524288, TCP_QUEUE_LIMIT 262144, PRE_OPEN_LIMIT 16384,
# CLIENT_MSG_RATE 60 / CLIENT_MSG_BURST 200, CLIENT_BYTE_RATE 32768 / CLIENT_BYTE_BURST 262144,
# MAX_SOCKETS_PER_IP 30, MAX_SOCKETS_TOTAL 2000, WS_IDLE_TIMEOUT 120, TCP_CONNECT_TIMEOUT 10.

USER bun
EXPOSE 3000

# Bun answers /server.json itself (proxy/serverManifest.ts); no curl in the slim image.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/server.json').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# With neither PROXY_TARGETS (aliases: the browser names a target, the proxy knows the address -
# proxy/targetAliases.ts) nor ALLOW_TARGETS, proxy/main.ts would dial ANY host:port a browser
# names. On a public box that is an open relay, so the container refuses to start instead of only
# warning. PROXY_TARGETS wins when both are set (ALLOW_TARGETS is then not consulted).
CMD ["sh", "-c", "if [ -z \"$PROXY_TARGETS\" ] && [ -z \"$ALLOW_TARGETS\" ]; then echo 'PROXY_TARGETS and ALLOW_TARGETS are empty - refusing to start an open relay' >&2; exit 1; fi; exec bun proxy/main.ts"]
