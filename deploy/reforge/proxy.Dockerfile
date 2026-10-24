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
# not an open relay with packet dumps: it refuses to start without ALLOW_TARGETS (entry check).

FROM oven/bun:1.4.2-slim
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

COPY tsconfig.json index.d.ts ./
COPY proxy ./proxy
COPY src ./src
COPY versions ./versions
COPY tools/sqliteMigrate.ts ./tools/sqliteMigrate.ts

ENV PORT=3000 \
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
    TRUSTED_PROXIES=127.0.0.1,::1,172.16.0.0/12 \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=0

# TRUSTED_PROXIES: nginx on the host reaches the container through the docker bridge gateway
# (172.16.0.0/12 by default), so its X-Real-IP is believed from there; without it every web player
# would be "172.x.0.1" to the per-address cap (MAX_SOCKETS_PER_IP) and the logs. Nothing else can
# reach port 3000 (compose publishes it on the host's 127.0.0.1 only). PROXY_PROTOCOL stays off
# until the game servers accept PROXY v2 from this box (proxy/readme.md).

USER bun
EXPOSE 3000

# Bun answers /server.json itself (proxy/serverManifest.ts); no curl in the slim image.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/server.json').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# An empty ALLOW_TARGETS makes proxy/main.ts dial ANY host:port a browser names. On a public
# box that is an open relay, so the container refuses to start instead of only warning.
CMD ["sh", "-c", "if [ -z \"$ALLOW_TARGETS\" ]; then echo 'ALLOW_TARGETS is empty - refusing to start an open relay' >&2; exit 1; fi; exec bun proxy/main.ts"]
