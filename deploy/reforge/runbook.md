# Mu Reforge web client - production runbook

Ordered steps to put the Babylon web client (version `reforge`, client 20404) in front of our
realms. The order is a correctness requirement: the game servers must accept the proxy's address
**before** the first web player arrives, or every web login is logged (or refused) as "no launcher".

Server-side summary for the game repo: `mu-reforge-server/deploy/prod/WEB-CLIENT.md`.
Release rules of the game itself (never kill the server, server before client): that repo's
`deploy/prod/DEPLOY-FLOW.md`. Nothing here restarts a game server.

**Forbidden on every box:** `install/get.sh`, `install/install.sh`, the `mu` CLI (`mu adopt` and
friends) and `docker/compose.yml` of this repo. The installer stops containers named like ours
(`database`, `openmu-startup`, `nginx-*`) with a plain `docker stop`, disables host nginx, enables
ufw (which drops WireGuard) and swaps in upstream OpenMU.

## Shape

```
browser --https--> web.mureforge.com  (host nginx :443, web box) --> 127.0.0.1:8731  web container (static nginx)
browser --wss----> ws.mureforge.com   (host nginx :443, web box) --> 127.0.0.1:8730  proxy container (Bun)
proxy   --tcp----> play.mureforge.com:44406           Molten connect server, Open Source client (20404)
proxy   --tcp----> 169.58.146.212:<OS port>           Molten game servers (ids 0-2)
proxy   --tcp----> 169.58.207.145:<OS port>           Inferno game servers (ids 20-22), listed by Molten
```

| Box | Address | WireGuard | Role here |
|---|---|---|---|
| web | `84.247.161.247` (`vmi3215666`) | `10.8.0.2` | host nginx + certbot (already there), the two new containers |
| Molten | `169.58.146.212` (`vmi3495783`) | `10.8.0.1` | admin panel settings only |
| Inferno | `169.58.207.145` (`inferno`) | `10.8.0.3` | admin panel settings only |

## Decisions (and why)

- **Hostnames `web.` and `ws.mureforge.com`.** `play.mureforge.com` is the game VPS (connect
  server), `api.mureforge.com` the website backend, `patch`/`auth`/`panel-*` the game VPS. The zone
  has a wildcard `*.mureforge.com -> 84.247.161.247`, so both new names already resolve to the web
  box; explicit A records are added anyway (W1) so nothing depends on the wildcard.
- **The world is published in the long form** (`play.mureforge.com:44406@wss://ws.mureforge.com`),
  never as the bare domain: the domain form makes the client call `register.` and `api.<domain>`,
  and `api.mureforge.com` is our website backend.
- **The proxy dials the public addresses, not the tunnel.** The connect server hands out each game
  server's public IP. A connect server reached over `10.8.0.1` would make the client try
  `10.8.0.1:<port>` first for Inferno's servers too (`gameServerTarget` in
  `src/modules/servers/serverConfig.ts`) - and Inferno's ports exist on Molten as well, so the
  player would land on the wrong realm. Hence: every web player reaches every realm as
  `84.247.161.247`.
- **Both containers bind 127.0.0.1 only**, on 8730/8731 (3000/3001 are the website's pm2 apps).
  TLS, per-address limits and the Origin check live in the host nginx.
- **Images are built in CI** (`.github/workflows/reforge-images.yml`) and pinned by sha tag in
  `.env`. The box never runs `bun`, `vite build` or `docker build`.
- **Proxy features off:** `LOG_PACKETS` (dumps logins), `TRACK` (journals every chat/whisper, GM
  stream), `ADMIN_OPEN`/`ADMIN_DEMO` (dev seams), `BAND` (C1 FA = our Item Collections), `PING`,
  `PRESENCE` (decrypts every login for a cash shop we do not run; it would stay on the container's
  loopback if ever enabled). The proxy image refuses to start with an empty `ALLOW_TARGETS`.
- **Server-side settings are changed on the admin panel**, which writes them to the database
  directly; they are not initialization data, so no hand-written SQL is needed
  (`prod-config-changes-need-sql` does not apply). The SQL below only reads, to verify.

## Before you start

1. The `reforge` version (`versions/reforge/`) and every client change you want live are committed
   on `main` of `PlugaruRoman/mu-reforge-client-web`, and **reforge images** is green for that
   commit. Note the commit sha: the tags are `sha-<40 hex>`.
2. A real account to test with (prod has no test accounts) - your own, on a character that may
   be online for a minute.
3. Commands go **one block at a time**: paste a block, wait for its output, then the next.
   Every block starts at the login; `sudo -i` once per session.

---

## Part S - game servers (Molten, then Inferno)

### S1. Molten: preflight

```bash
ssh murlocbasturma@169.58.146.212
```

```bash
sudo -i
hostname; ip -4 -o addr show wg0 | grep -oE '10\.8\.0\.[0-9]+'
/root/status.sh
```

Read back: `vmi3495783` and `10.8.0.1`. Anything else - stop, you are on the wrong box.

### S2. Molten: read ports and current limits (read-only)

```bash
cd /root/mu-reforge-server/deploy/prod
docker exec -i database psql -U postgres -d openmu <<'SQL'
-- Every game server endpoint: the "Open Source Client" rows are the ports the proxy may dial.
SELECT g."ServerID", g."Description" AS server, c."Description" AS client,
       e."NetworkPort", e."AlternativePublishedPort"
FROM config."GameServerEndpoint" e
JOIN config."GameServerDefinition" g ON g."Id" = e."GameServerDefinitionId"
JOIN config."GameClientDefinition" c ON c."Id" = e."ClientId"
ORDER BY g."ServerID", e."NetworkPort";

-- Connect servers: the Open Source one listens on 44406.
SELECT "ServerId", "Description", "ClientListenerPort",
       "CheckMaxConnectionsPerAddress", "MaxConnectionsPerAddress", "MaxConnections"
FROM config."ConnectServerDefinition" ORDER BY "ClientListenerPort";

-- RequireLauncher, MaximumConnectionsPerIp, MaximumSessionsPerMachine.
SELECT "TypeId", "IsActive", "CustomConfiguration"
FROM config."PlugInConfiguration"
WHERE "TypeId" IN ('6e1f1d6c-0f26-4e5a-9e7c-6a4e2c7a9b31',
                   '2c779f5e-379e-4ce0-bfcc-ca6455d757b3',
                   '3b7d1e52-9c64-4f08-a1d3-7e2c5b90f418');
SQL
curl -s http://10.8.0.3:8080/api/game-servers; echo
```

Write down:
- the three `NetworkPort`s of the rows whose client is **Season 6 Episode 3 Open Source Client**
  (if `AlternativePublishedPort` is non-zero, that is the published one) - Molten's OS ports;
- the last `curl` is Inferno's list as Molten sees it: its OS endpoints are Inferno's OS ports
  (cross-check them in S7);
- `MaxConnectionsPerAddress` of the 44406 row (default 30);
- which of the three plug-ins is `IsActive`, and their JSON.

### S3. Molten: admin panel

`https://panel-k7m2q9.mureforge.com` (Authelia + TOTP).

1. **Plugins** (`/plugins`) -> **Require Launcher** -> configuration -> **Exempt Addresses**:
   append `;84.247.161.247` to the existing value (keep `127.0.0.1;::1;192.168.*;10.*`). No `*`:
   the exemption must match this one address exactly. Save.
2. **Plugins** -> **Maximum Connections Per IP** (disabled by default): if it is **active**, add
   `84.247.161.247` to **Exempt Ip Addresses** (semicolon separated). Every web player shares that
   address; without the exemption the 4th web player is told "the server is full". If inactive,
   change nothing.
3. **Plugins** -> **Maximum Sessions Per Machine**: **Refuse Without Machine Id must stay off.** The
   web client sends no machine id (`C1 E7 00`); with it on, every web login is refused. Nothing to
   change, only check.
4. **Servers** (`/servers`) -> the connect server **Season 6 Episode 3 Open Source Client** (port
   44406) -> edit -> **Max Connections Per Address**: `30` -> `500`. Keep **Check Max Connections
   Per Address** on (it still protects against every other address). Save.
   The connect server reads its settings when it starts; if S10 shows the old value still in
   force, it takes effect at the next normal game deployment (DEPLOY-FLOW section 2). Until then
   web players are capped at 30 *simultaneous* connect-server sockets, which only matters at
   peak - each player holds one for a few seconds while picking a server.
5. Nothing on **Runtime Guard**: it challenges only clients that sent a machine id, so web players
   are never challenged and never scored for silence.

### S4. Molten: verify the panel wrote it

```bash
cd /root/mu-reforge-server/deploy/prod
docker exec -i database psql -U postgres -d openmu <<'SQL'
SELECT "TypeId", "IsActive", "CustomConfiguration"
FROM config."PlugInConfiguration"
WHERE "TypeId" IN ('6e1f1d6c-0f26-4e5a-9e7c-6a4e2c7a9b31', '2c779f5e-379e-4ce0-bfcc-ca6455d757b3');
SELECT "ClientListenerPort", "MaxConnectionsPerAddress"
FROM config."ConnectServerDefinition" WHERE "ClientListenerPort" = 44406;
SQL
```

The Require Launcher JSON contains `84.247.161.247`; the 44406 row says `500`.

### S5. Molten: fail2ban never bans the web box

The `authelia` jail bans with `iptables-allports` in `DOCKER-USER`: a ban of `84.247.161.247`
would cut every web player off every game port. The web box never talks to Authelia, so this is
belt and braces. A separate file, so the repository's `authelia.local` stays as it is:

```bash
fail2ban-client get authelia ignoreip
```

Copy what it prints (often `127.0.0.1/8 ::1`) into the line below - a jail-level `ignoreip`
replaces the default list, it does not add to it:

```bash
cat > /etc/fail2ban/jail.d/zz-webclient-ignore.local <<'EOF'
# Web client proxy (web box) and the WireGuard peers. See deploy/prod/WEB-CLIENT.md.
[authelia]
ignoreip = 127.0.0.1/8 ::1 10.8.0.0/24 84.247.161.247
EOF
systemctl reload fail2ban
fail2ban-client get authelia ignoreip
fail2ban-client status authelia | head -5
```

### S6. Inferno: preflight

```bash
ssh murlocbasturma@169.58.207.145
```

```bash
sudo -i
hostname; ip -4 -o addr show wg0 | grep -oE '10\.8\.0\.[0-9]+'
/root/status.sh
```

Read back: `inferno` and `10.8.0.3`.

### S7. Inferno: ports and plug-ins (read-only)

Same SQL as S2, on this box:

```bash
cd /root/mu-reforge-server/deploy/prod
docker exec -i database psql -U postgres -d openmu <<'SQL'
SELECT g."ServerID", g."Description" AS server, c."Description" AS client,
       e."NetworkPort", e."AlternativePublishedPort"
FROM config."GameServerEndpoint" e
JOIN config."GameServerDefinition" g ON g."Id" = e."GameServerDefinitionId"
JOIN config."GameClientDefinition" c ON c."Id" = e."ClientId"
ORDER BY g."ServerID", e."NetworkPort";
SELECT "TypeId", "IsActive", "CustomConfiguration"
FROM config."PlugInConfiguration"
WHERE "TypeId" IN ('6e1f1d6c-0f26-4e5a-9e7c-6a4e2c7a9b31',
                   '2c779f5e-379e-4ce0-bfcc-ca6455d757b3',
                   '3b7d1e52-9c64-4f08-a1d3-7e2c5b90f418');
SQL
```

Inferno's OS ports = the Open Source rows (ids 20-22). They must agree with what Molten's `curl`
showed in S2.

### S8. Inferno: admin panel

`https://panel-x7q2m.inferno.mureforge.com` - steps S3.1, S3.2 and S3.3 exactly as on Molten.
Skip S3.4: web players reach Inferno's game servers through **Molten's** connect server. (Only if
Inferno's connect server is ever added as a fall-back world line in `serverlist.md`, raise its
44406 limit too and add `169.58.207.145:44406` to `ALLOW_TARGETS`.)

### S9. Inferno: verify and fail2ban

S4's SQL (the plug-in half; there is no 44406 change here), then S5 verbatim on this box.

---

## Part W - web box

### W0. Preflight

```bash
ssh murlocbasturma@84.247.161.247
```

```bash
sudo -i
hostname; ip -4 -o addr show wg0 | grep -oE '10\.8\.0\.[0-9]+'
nginx -v; nginx -t
docker version --format '{{.Server.Version}}'; docker compose version
ss -ltnp | grep -E ':(8730|8731)\b' || echo "8730/8731 free"
grep -rn "server_name" /etc/nginx/sites-enabled/ | grep -E "web\.mureforge|ws\.mureforge" || echo "no vhost for web./ws. yet"
grep -rn "mu_ws_\|mu_web_\|MU_WEB_SSL\|MU_WS_SSL" /etc/nginx/ || echo "no zone name clash"
ls /etc/letsencrypt/live/; systemctl list-timers | grep -i certbot
df -h / | tail -1; free -h | head -2
fail2ban-client status 2>/dev/null | head -3
```

Read back: `vmi3215666`, `10.8.0.2`; `nginx -t` ok; both ports free; no existing vhost or zone
with our names; a certbot timer (or cron) exists; at least 10 GB free (the web image is a few GB).
If Docker is missing, stop here and ask - do not install it with any script from this repository.

### W1. DNS

Contabo DNS panel, zone `mureforge.com`: two A records, TTL 300.

| Name | Type | Value |
|---|---|---|
| `web` | A | `84.247.161.247` |
| `ws` | A | `84.247.161.247` |

Touch nothing else (apex, `www`, MX, `play`, `patch`, `auth`, `panel-*`). Verify authoritatively,
never with a cached resolver:

```bash
dig +short @ns1.contabo.net web.mureforge.com
dig +short @ns1.contabo.net ws.mureforge.com
dig +short @ns1.contabo.net play.mureforge.com
```

The first two print `84.247.161.247`, the third still `169.58.146.212`.

### W2. Files onto the box

From the Windows machine (PowerShell), the deploy folder of this repository:

```cmd
scp -r D:\Development\babylon\deploy\reforge murlocbasturma@84.247.161.247:/home/murlocbasturma/webclient-kit
```

On the box:

```bash
mkdir -p /opt/mureforge-webclient /var/www/letsencrypt
cd /opt/mureforge-webclient
cp /home/murlocbasturma/webclient-kit/compose.yml /home/murlocbasturma/webclient-kit/serverlist.md .
cp -n /home/murlocbasturma/webclient-kit/.env.example .env
cp -n /home/murlocbasturma/webclient-kit/proxy.env.example proxy.env
chmod 600 .env proxy.env
ls -la
```

Then edit, with the values from S2/S7 and the CI run:

```bash
nano .env        # WEB_IMAGE / PROXY_IMAGE = ...:sha-<the commit sha>
nano proxy.env   # ALLOW_TARGETS = the real OS ports of Molten AND Inferno
grep -E '^(WEB_IMAGE|PROXY_IMAGE)=' .env
grep -E '^(ALLOW_TARGETS|LOG_PACKETS|TRACK|ADMIN_OPEN|ADMIN_DEMO|BAND|PRESENCE)=' proxy.env
```

Expected: both images end in the same `sha-...`; `ALLOW_TARGETS` holds
`play.mureforge.com:44406`, `169.58.146.212:44406` and three ports per realm IP; every switch
below it reads `off`.

### W3. Registry login (only if the packages are private)

ghcr packages of a private repository are private. A classic PAT with only `read:packages`:

```bash
echo '<PAT>' | docker login ghcr.io -u PlugaruRoman --password-stdin
```

### W4. HTTP vhost and certificate

```bash
cp /home/murlocbasturma/webclient-kit/nginx/host/mureforge-webclient-http.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/mureforge-webclient-http.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
curl -sI http://web.mureforge.com/ | head -3
```

Expect `301` to `https://web.mureforge.com/`. Then the certificate (webroot, so certbot edits no
nginx file; the deploy hook reloads nginx on every renewal):

```bash
certbot certonly --webroot -w /var/www/letsencrypt --cert-name mureforge-webclient \
  -d web.mureforge.com -d ws.mureforge.com \
  --deploy-hook "systemctl reload nginx"
ls /etc/letsencrypt/live/mureforge-webclient/
certbot renew --cert-name mureforge-webclient --dry-run
```

If `nginx -t` rejects `listen [::]:80` (IPv6 off on this box), delete the `[::]` lines from all
three vhost files and repeat.

### W5. Containers

```bash
cd /opt/mureforge-webclient
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail 30 proxy
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8731/build.json
curl -s http://127.0.0.1:8730/server.json; echo
```

The proxy log must show `allowed targets: play.mureforge.com:44406, ...`, `track: off`,
`band: off`, `ping: off` and **no** `ALLOW_TARGETS is unset` warning. `build.json` answers 200,
`server.json` a document with `"modulesOff":["band","marketplace"]`.

### W6. HTTPS vhosts

```bash
cp /home/murlocbasturma/webclient-kit/nginx/host/web.mureforge.com.conf /etc/nginx/sites-available/
cp /home/murlocbasturma/webclient-kit/nginx/host/ws.mureforge.com.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/web.mureforge.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/ws.mureforge.com.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

A `nginx -t` failure leaves the running config untouched; read the message (a duplicate zone or
`map` name means another vhost uses it - rename ours) before anything else.

### W7. Verify

```bash
# Static site: index no-cache, hashed bundle immutable, a gzip sidecar as opaque bytes.
curl -sI https://web.mureforge.com/ | grep -iE '^(HTTP|cache-control|strict-transport)'
curl -s https://web.mureforge.com/build.json; echo
curl -s https://web.mureforge.com/serverlist.md | grep REFORGE
A=$(curl -s https://web.mureforge.com/ | grep -oE 'assets/[^"]+\.js' | head -1); echo "$A"
curl -sI "https://web.mureforge.com/$A" | grep -iE '^(HTTP|cache-control)'
curl -sI https://web.mureforge.com/Data/does-not-exist.bmd | head -1
# The proxy: manifest, a refused origin, a refused target, a real handshake.
curl -s https://ws.mureforge.com/server.json; echo
curl -s -o /dev/null -w 'no origin: %{http_code}\n' "https://ws.mureforge.com/?host=play.mureforge.com&port=44406"
curl -s -o /dev/null -w 'bad target: %{http_code}\n' -H 'Origin: https://web.mureforge.com' \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' "https://ws.mureforge.com/?host=127.0.0.1&port=22"
curl -si --http1.1 --max-time 4 -H 'Origin: https://web.mureforge.com' \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  "https://ws.mureforge.com/?host=play.mureforge.com&port=44406" | head -1
```

Expected: `200` + `cache-control: no-cache` + `strict-transport-security`; the build id; the
REFORGE line; the bundle with `max-age=31536000, immutable`; `404` for the missing file (never
200); the manifest; `no origin: 403`; `bad target: 403`; `HTTP/1.1 101 Switching Protocols`.

Then in a browser (a private window, so no old cache): `https://web.mureforge.com`, pick
**Mu Reforge**, a Molten channel, log in with your account, enter the game, walk, open the
inventory, log out. Repeat on an Inferno channel. While logged in, on **Molten** (S1 login):

```bash
ss -tn state established '( sport = :44406 or ( sport >= :55901 and sport <= :55906 ) )' | grep -c 84.247.161.247
grep -h "84.247.161.247" /root/mu-reforge-server/deploy/prod/data/logs/log$(date +%Y%m%d)*.txt | tail -5
```

The count is at least 1 while you are connected. The log must **not** show `has no launcher
clearance` or `refused` for `84.247.161.247`; if it does, S3.1 did not take (check S4). The same
`grep` on Inferno after the Inferno login.

Last, on the web box: `docker compose logs --since 10m proxy | grep -E "refused target|tcp connect error"`
- empty is the good answer. A `refused target 169.58.x.x:559xx` means `ALLOW_TARGETS` lacks a
port: fix `proxy.env` and `docker compose up -d proxy`.

---

## Updating

- **Client only** (new web image): set the new `WEB_IMAGE` sha in `.env`, then
  `docker compose pull web && docker compose up -d web`. Nobody is disconnected; open tabs see the
  new `build.json` and offer a reload.
- **Proxy** (new image or `proxy.env` change): **every web player is disconnected** - each is
  saved by the game server's normal logout path, but announce it like a game restart. Then
  `docker compose pull proxy && docker compose up -d proxy`.
- **World list**: edit `/opt/mureforge-webclient/serverlist.md`; it is live at once (no-cache),
  clients pick it up on their next launch.
- **A new game port / realm**: `ALLOW_TARGETS` first, then the realm's panel settings (S3), then
  the world list.
- Server releases (DEPLOY-FLOW) need nothing here, unless they change ports or client definitions.

## Rollback

| What | How | Effect |
|---|---|---|
| bad client build | previous `WEB_IMAGE` sha in `.env`, `docker compose up -d web` | none for players in game |
| bad proxy build | previous `PROXY_IMAGE` sha, `docker compose up -d proxy` | web players reconnect |
| take the web client offline | `rm /etc/nginx/sites-enabled/web.mureforge.com.conf /etc/nginx/sites-enabled/ws.mureforge.com.conf && nginx -t && systemctl reload nginx`, then `cd /opt/mureforge-webclient && docker compose stop` | web players dropped; desktop untouched |
| undo the server side | panel: remove `;84.247.161.247` from Require Launcher (and Maximum Connections Per IP), connect server 44406 back to `30`; `rm /etc/fail2ban/jail.d/zz-webclient-ignore.local && systemctl reload fail2ban` | on both realms |

`docker compose stop`/`down` in `/opt/mureforge-webclient` only ever touches the
`mureforge-webclient` project. Never run either in `/root/mu-reforge-server/deploy/prod`.
Take the web client offline **before** undoing the server side, or the web players still
connected start logging launcher warnings (or get refused if Refuse Login is armed).

## Risks

- **R1 - the proxy is a launcher-free door, by design.** The exemption matches the TCP source
  address exactly, and a TCP source cannot be forged past the handshake, so desktop players from
  any other address are still checked - restricting 44406/the OS ports to the proxy in
  `DOCKER-USER` is impossible (desktop players use the same ports) and not needed. What the
  exemption *does* open: anyone who speaks the protocol over `wss://ws.mureforge.com` (a bot, a
  modified browser client) plays without launcher, without HWID, without Runtime Guard and
  without the per-machine limit. Mitigations here: `ALLOW_TARGETS`, the Origin check (weak: a
  script forges it), per-address `limit_conn 10` / `limit_req 30r/m`, a 3000-socket ceiling. Watch
  `/cheat-violations` and the item audit for accounts that only ever log in from `84.247.161.247`.
  The real fix, later: a separate client definition (own version bytes, own connect and game
  ports) for the web client, so the exemption covers only ports desktop players never use.
- **R2 - every process on the web box is exempt too.** Anything on `84.247.161.247` (the website,
  the other tenant's apps) that opens a TCP connection to a game port passes the launcher check.
  A compromise of the other tenant becomes a launcher bypass. Keep that tenant patched; the
  long-term fix is R1's separate client definition or a dedicated egress address for the proxy.
- **R3 - no per-player limits at the game server.** Maximum Connections Per IP and Maximum Sessions Per
  Machine cannot tell web players apart; the nginx per-address limits are the only replacement
  (a household behind one NAT counts as one address).
- **R4 - one 30-socket bucket at the connect server** until the 500 from S3.4 is live. Past it the
  31st simultaneous server-select fails as a connection error for web players only.
- **R5 - a proxy restart drops every web player** (see Updating). Their progress is saved by the
  logout path, like any disconnect; announce it anyway.
- **R6 - fail2ban** on a game box banning `84.247.161.247` would cut every web player off every
  game port (allports in DOCKER-USER). S5/S9 exempt it.
- **R7 - C1 FA is the band's code and our Item Collections'.** The proxy keeps client frames with
  code `0xFA` only while `BAND` is on (`proxy/clientFrames.ts`); with `BAND=off` they reach the game
  server, which the web client's Item Collections window (FA 01 / FA 02) needs. Never turn `BAND`
  on for a Reforge proxy.
- **R8 - bandwidth and disk on the web box.** A first visit downloads hundreds of MB of game
  data (the gzip sidecars cut it to about a third). It is the same box as the website; watch
  `vnstat`/Contabo traffic and the nginx access log size. A CDN in front of `web.` would move it
  off the box (open question).
- **R9 - the website's ports.** 3000/3001 are pm2 apps; the containers use 8730/8731 on loopback.
  A future pm2 app on those ports fails to start, not silently.
- **R10 - certificate renewal** reloads nginx; open websockets survive a reload (old workers keep
  them), so renewals do not disconnect players.
- **R11 - the client still lacks most fork features** (VIP, banks, market, events, custom maps
  83-96, custom items): players can hit invisible items or maps that do not load. Decide the
  audience (beta flag on the site) before linking it publicly.
- **R12 - stat display.** Extended packets are used (20404), so HP/stats above 65535 display
  correctly; any packet still parsed in its classic form (see `versions/reforge/readme.md`,
  "Not yet") can show stale or wrong values.

## Decisions (2026-10-21)

- Hostnames: `web.mureforge.com` (page) + `ws.mureforge.com` (proxy). `play.` stays the game VPS.
- Realms: Molten **and** Inferno, both through Molten's connect server 44406 - Inferno is already
  listed on Molten through `REMOTE_REALM_URLS` (`RemoteRealmServerRegistrar`), so `ALLOW_TARGETS`
  carries the Open Source ports of both realms.
- No CDN at launch. If one is added later it fronts `web.` only; should it ever front `ws.`, nginx
  must read the real client address from the CDN header first, or the per-address limits see the
  CDN's addresses.
- Register link: `https://mureforge.com/register` (default of `VITE_REGISTER_URL` in
  `web.Dockerfile`; the repository variable `REFORGE_REGISTER_URL` overrides it).
- Require Launcher: the proxy exemption (S3) is added on both realms whatever **Refuse Login** is
  today - with it off the exemption only silences warnings, and it has to be in place before the
  switch is ever armed. Check the current state in S2/S7 and write it down.
