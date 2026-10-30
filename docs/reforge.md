# Mu Reforge web client: how it works

This repository is our fork of the Babylon client (upstream: `Ignies/OpenMu-Client-Babylon`). It
plays one world only: Mu Reforge, our OpenMU fork (`mu-reforge-server`). This page is the overview;
the details live in the readmes it links.

## The pieces

```
browser ── https ──> web.mureforge.com   static client (nginx in a container)
   │
   └──── wss ─────> ws.mureforge.com     proxy (Bun, proxy/main.ts) ── tcp ──> game VPSs
                                                                                connect server 44406
                                                                                game servers, chat
```

- **The client** (`src/`, `versions/`) is a static bundle. In production it is built pinned (below),
  so it knows exactly one world and one game version: `reforge` (`versions/reforge/readme.md`).
- **The proxy** turns the browser's WebSocket into the TCP connections the game servers speak. The
  browser never learns a server address: it asks for an alias (`cs`, `molten-1`, ...) and the proxy
  resolves it from `PROXY_TARGETS`. Addresses inside the game's own packets (ConnectionInfo, the chat
  room info) are rewritten into aliases on the way back (`proxy/addressRewrite.ts`).
- **The game server** treats a web player like a desktop one, with three web-specific settings:
  client version `20404` on the Open Source connect server (44406), the proxy's address as a trusted
  PROXY v2 sender (so it sees each player's real address), and "Exempt Web Sessions" in Require
  Launcher (a browser has no launcher). See `mu-reforge-server/deploy/prod/WEB-CLIENT.md`.

## The production build

`deploy/reforge/web.Dockerfile` builds with these switches (CI defaults, `.github/workflows/reforge-images.yml`):

| Variable | Value | Effect |
|---|---|---|
| `VITE_PINNED_WORLD` | `on` | One world, the first of the build's own list. No worlds page, no Setup, no offline scene, no debug handles; `?ws=` / `?cs=` / saved profiles are ignored, and only a world on the build's own proxy is played (`src/core/buildFlags.ts`, `src/modules/servers/serverConfig.ts`). |
| `VITE_PINNED_VERSION` | `REFORGE` | Only the `reforge` version is bundled (`versions/registry.ts`). |
| `VITE_WS_HOST` / `VITE_WS_PORT` | `wss://ws.mureforge.com` / `443` | The proxy. |
| `VITE_SERVER_LIST_URL` | `https://web.mureforge.com/serverlist.md` | The published list, `deploy/reforge/serverlist.md`. |
| `VITE_REGISTER_URL` | `https://mureforge.com/register` | Registration is the website's; the client only links to it. |

Source maps are off and `console.log` is stripped (`vite.config.ts`).

## The server list

`deploy/reforge/serverlist.md` names the world and its groups; the connect server sends only ids:

```
[1:REFORGE:Mu Reforge:Molten x100 PvP and Inferno x1200:en](cs@wss://ws.mureforge.com)
- 0: Molten
  - 0: Molten-1
- 1: Inferno
  - 0: Inferno-1
```

`cs@wss://...` is the alias form: the list carries no address. The `reforge` version groups ids by
twenty like our C++ client (`serverGroupSize: 20`): id 0-19 is the first button (Molten), 20-39 the
second (Inferno), the channel is `id % 20` (`src/modules/servers/serverGroups.ts`). Every game server
the connect server hands out needs an alias in `PROXY_TARGETS`.

## Running it locally

`start-prod.ps1` (right click, Run with PowerShell) opens two windows and the browser:

- the client on `http://localhost:5180`, built with the same switches as production but against
  this machine's proxy (`public/reforge-prod-serverlist.md`);
- the proxy on `127.0.0.1:3000` only - without `PROXY_TARGETS` it relays to any host, which is fine
  for one browser on this machine and nothing else.

It plays the live servers with a real account. There is no local game server in this setup.

Two things that bite:

- **Never run two dev servers at once.** `vite.config.ts` has `optimizeDeps.force`, and both share
  `node_modules/.vite`: the second one's optimizer pulls the chunks from under the first one's open
  tabs ("Failed to fetch dynamically imported module"). A tab that still asks for a deleted chunk
  keeps failing after a restart; a fresh port (or clearing the site's cache) fixes it.
- The first load after a start takes about a minute while vite optimizes.

### Testing windows that need a character in the world

A custom window can only be checked in the game. That needs a local `-demo` game server
(`dotnet run --project src/Startup/MUnique.OpenMU.Startup.csproj -- -demo -autostart -resolveIP:loopback`
in `mu-reforge-server`, test accounts `testgm`/`testgm` etc.) and an unpinned client pointing at it:
`VITE_PINNED_WORLD=off`, `VITE_CS_HOST=127.0.0.1`, `VITE_CS_PORT=44406`, `VITE_CS_VERSION=REFORGE`,
and a list with a `127.0.0.1:44406@ws://localhost:3000` world. Set it up for the test and remove it
again; it is not part of the repository on purpose.

## Checks before a commit

```
bun run tsc         # install/cli errors are upstream's and expected
bun run check       # structure rules (tools/checks)
bun run test        # vitest
bunx eslint . -f json > lint.json && bun tools/checks/lintRatchet.ts < lint.json
```

Run them without a local `.env`/`.env.local` override: vitest reads it, and a pinned local env fails
the tests that expect the default version.

## Deploying

1. Push to `main`: `.github/workflows/reforge-images.yml` builds `web` and `proxy` images to
   `ghcr.io/plugaruroman/mu-reforge-client-web/{web,proxy}`, tagged `latest` and `sha-<commit>`.
2. On the web VPS, point `WEB_IMAGE` / `PROXY_IMAGE` in `.env` at the new `sha-` tags and run
   `docker compose pull && docker compose up -d`.

The step-by-step runbook (provisioning, firewall, the game servers' settings, verification,
rollback) is in the private server repository: `mu-reforge-server/deploy/prod/WEB-CLIENT-RUNBOOK.md`.
This repository is public: no panel hostnames, logins or firewall exemptions in it.

Before the link is public: PROXY v2 live on every realm (the game server then sees each player's
address, so its per-address limits apply to web players too), the proxy's address removed from the
game servers' exemptions, and Cloudflare in front of `web.` and `ws.`.

## What protects the servers

- **Proxy** (`proxy/relayLimits.ts`, `deploy/reforge/nginx/host/`): 30 sockets and 60 new ones a
  minute per address, 2000 in all, 60 frames and 32 KiB a second per socket, 16 KiB frames, Origin
  check, aliases only (no raw `host:port`).
- **Game server** (`mu-reforge-server`): a packet flood limit, per-player limits on every request
  that touches the database, password-check gate and lockouts on login, per-address limits once
  PROXY v2 is on. A modified client - the source is public - gets nothing the server would refuse
  a desktop client.

## Updating from upstream

```
git fetch upstream
git log --oneline main..upstream/main     # anything new?
git merge upstream/main
```

Then the checks above. Keep our side where they meet: `versions/reforge`, the pinned-build switch,
the proxy's aliases and limits, `deploy/reforge`. Golden tests that hash text or key lists change
when upstream adds strings or keys; recompute them, don't loosen them.
