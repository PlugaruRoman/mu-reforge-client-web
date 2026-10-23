# syntax=docker/dockerfile:1.7
#
# The Mu Reforge web client: `bun run build` (vite + Data copy + gzip sidecars + asset index),
# served by a plain nginx with the cache rules in nginx/web-container.conf.
#
# Built in CI (.github/workflows/reforge-images.yml), never on the web box: the build needs the
# whole Data/ tree and several GB of scratch space. Build context = repository root:
#
#   docker build -f deploy/reforge/web.Dockerfile -t mu-reforge-web:local .
#
# The VITE_* values are baked into the JS at build time (vite replaces import.meta.env.*), so
# changing one needs a new image - restarting the container changes nothing.

FROM oven/bun:1.4.2 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Defaults for a fresh profile and the published list. The serverlist.md the client reads is the
# one mounted into the runtime container (compose.yml), so the list itself is edited on the box.
ARG VITE_WS_HOST=wss://ws.mureforge.com
ARG VITE_WS_PORT=443
ARG VITE_CS_HOST=play.mureforge.com
ARG VITE_CS_PORT=44406
ARG VITE_SERVER_LIST_URL=https://web.mureforge.com/serverlist.md
ARG VITE_REGISTER_URL=https://mureforge.com/register
# vite.config.ts names the build after it (build.json, the asset worker's cache key).
ARG GITHUB_SHA=

# A developer's .env.local (ws://localhost) must never reach a production bundle: vite reads
# .env* files from the root, and the dockerignore is the first guard, this the second.
RUN rm -f .env .env.local .env.production .env.production.local \
 && VITE_WS_HOST="$VITE_WS_HOST" VITE_WS_PORT="$VITE_WS_PORT" \
    VITE_CS_HOST="$VITE_CS_HOST" VITE_CS_PORT="$VITE_CS_PORT" \
    VITE_SERVER_LIST_URL="$VITE_SERVER_LIST_URL" VITE_REGISTER_URL="$VITE_REGISTER_URL" \
    GITHUB_SHA="$GITHUB_SHA" bun run build

FROM nginx:1.28-alpine
COPY deploy/reforge/nginx/web-container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Fallback copy; compose.yml bind-mounts the box's own serverlist.md over it.
COPY deploy/reforge/serverlist.md /usr/share/nginx/html/serverlist.md
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO /dev/null http://127.0.0.1/build.json || exit 1
