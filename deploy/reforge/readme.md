# deploy/reforge

Production deployment of this client for Mu Reforge (our OpenMU fork, `mu-reforge-server`):
two images built in CI, run on a dedicated VPS (`WEB_VPS_IP`, Ubuntu 24.04) behind its host
nginx. Not the installer (`install/`), which must never run on our machines.

## Files
- `runbook.md`: provisioning and hardening of the VPS, the game servers' settings, the web VPS
  deploy, verification, monitoring, updating, rollback, kill switch, risks. Start here.
- `web.Dockerfile` (+ `.dockerignore`): `bun run build` -> nginx with `nginx/web-container.conf`.
- `proxy.Dockerfile` (+ `.dockerignore`): `proxy/main.ts` on Bun; refuses to start without
  `ALLOW_TARGETS`.
- `compose.yml`, `.env.example`, `proxy.env.example`: the two containers on 127.0.0.1:8731/8730.
- `nginx/host/`: the host vhosts for `web.mureforge.com` (static, CSP and security headers) and
  `ws.mureforge.com` (wss, per-address limits, Origin check), plus the port-80 vhost for the ACME
  challenge and the catch-all default servers.
- `serverlist.md`: the published world list (REFORGE, Molten's connect server 44406).
- Images: `.github/workflows/reforge-images.yml` -> `ghcr.io/plugaruroman/mu-reforge-client-web/{web,proxy}`.
