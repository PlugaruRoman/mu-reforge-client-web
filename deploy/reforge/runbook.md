# Mu Reforge web client - production runbook

Ordered steps to put the Babylon web client (version `reforge`, client 20404) in front of our
realms, on a **dedicated VPS** of its own. The order is a correctness requirement: the game
servers must accept the web VPS's address **before** the first web player arrives, or every web
login is logged (or refused) as "no launcher".

Server-side summary for the game repo: `mu-reforge-server/deploy/prod/WEB-CLIENT.md`.
Release rules of the game itself (never kill the server, server before client): that repo's
`deploy/prod/DEPLOY-FLOW.md`. **Nothing in this runbook stops or restarts a game server**, and no
command here is ever run in `/root/mu-reforge-server/deploy/prod` except read-only SQL, `iptables`
on the `DOCKER-USER` chain and fail2ban files.

**Forbidden on every box:** `install/get.sh`, `install/install.sh`, the `mu` CLI (`mu adopt` and
friends) and `docker/compose.yml` of this repo. The installer stops containers named like ours
(`database`, `openmu-startup`, `nginx-*`) with a plain `docker stop`, disables host nginx, enables
ufw (which drops WireGuard) and swaps in upstream OpenMU.

## `WEB_VPS_IP` - the one value to fill in

The web VPS's public IPv4 is not known until it is ordered (P1). Everywhere below it is written
`WEB_VPS_IP` (or `$WEB_VPS_IP` in shell blocks, after `export WEB_VPS_IP=<the address>` in that
session - each box's preflight step does it and refuses to go on without it). The places that
need the real address:

| Where | What | Step |
|---|---|---|
| Contabo DNS, zone `mureforge.com` | A records `web` and `ws` | W1 |
| Molten admin panel | Require Launcher -> Exempt Addresses; Maximum Connections Per IP -> Exempt Ip Addresses (if active); connect server 44406 -> Max Connections Per Address: Exempt Addresses; Abuse Protection -> Login Ip Exempt Addresses; System -> Trusted Proxies | S3, S11 |
| Inferno admin panel | Require Launcher; Maximum Connections Per IP (if active); Abuse Protection -> Login Ip Exempt Addresses; System -> Trusted Proxies | S8, S11 |
| Molten and Inferno, `/etc/fail2ban/jail.d/zz-webclient-ignore.local` | `ignoreip` | S5, S9 |
| Molten and Inferno, `DOCKER-USER` (only if throttling rules exist) | the allow rule / its unit | S6, S9 |
| Molten and Inferno, kill switch | `DOCKER-USER` drop | "Kill switch" |
| uptime monitor | nothing (it checks the names, not the IP) | M1 |
| `mu-reforge-server/deploy/prod/WEB-CLIENT.md` | the address in its table, once known | after W11 |

No file of this kit holds the address: the nginx vhosts, `compose.yml` and both env files work
unchanged on any IP.

## Shape

```
browser --https--> web.mureforge.com  (host nginx :443, web VPS) --> 127.0.0.1:8731  web container (static nginx)
browser --wss----> ws.mureforge.com   (host nginx :443, web VPS) --> 127.0.0.1:8730  proxy container (Bun)
proxy   --tcp----> play.mureforge.com:44406           Molten connect server, Open Source client (20404)
proxy   --tcp----> 169.58.146.212:<OS port>           Molten game servers (ids 0-2)
proxy   --tcp----> 169.58.207.145:<OS port>           Inferno game servers (ids 20-22), listed by Molten
```

| Box | Address | WireGuard | Role here |
|---|---|---|---|
| web client VPS | `WEB_VPS_IP` (new, Contabo, Ubuntu 24.04) | **none** | host nginx + certbot, the two containers, nothing else |
| Molten | `169.58.146.212` (`vmi3495783`) | `10.8.0.1` | admin panel settings, fail2ban, firewall |
| Inferno | `169.58.207.145` (`inferno`) | `10.8.0.3` | admin panel settings, fail2ban, firewall |
| website | `84.247.161.247` (`vmi3215666`) | `10.8.0.2` | **not involved** (no file, no vhost, no exemption) |

## Decisions (and why)

- **A dedicated VPS, not the website box.** Every web player reaches the game as this box's
  address, and that address is exempt from the launcher check: anything else running on the box
  inherits the exemption. On the website box that was the website, its backend and an unrelated
  second tenant (old risk R2); here it is our two containers and nothing else. It also keeps the
  first-visit downloads (hundreds of MB per player) off the website's bandwidth, and a proxy
  overload off the website's CPU. Same provider and region as the game VPSes (Contabo, EU) for a
  short, cheap path to the game ports.
- **Host nginx + certbot from apt, not nginx in compose.** (1) Docker's published ports bypass
  ufw; with nginx on the host, both containers publish on `127.0.0.1` only and ufw's
  22/80/443 is the whole truth about what is reachable. An nginx container would publish 80/443
  on `0.0.0.0` past ufw, and IPv6 or `userland-proxy` setups can then hide the client address
  behind the docker gateway - which would break every per-address limit. (2) Ubuntu's certbot
  timer + `--deploy-hook "systemctl reload nginx"` is the path the game boxes' operators already
  know; no certbot container, no shared volume, no cron to remember. (3) A reload keeps open
  websockets on the old workers, so renewals never disconnect players. (4) nginx upgrades come
  with unattended-upgrades' security channel.
- **IPv4 only.** Only A records, no AAAA, no `[::]` listens. Every per-address limit keys on the
  whole client address; an IPv6 client owns a /64 and could rotate past them. If AAAA records are
  ever wanted, key the limit zones on the /64 first.
- **Hostnames `web.` and `ws.mureforge.com`.** `play.mureforge.com` is the game VPS (connect
  server), `api.mureforge.com` the website backend, `patch`/`auth`/`panel-*` the game VPS. The
  zone has a wildcard `*.mureforge.com -> 84.247.161.247` (the website box): until W1's explicit
  A records exist, both names silently resolve to the **website**.
- **The world is published in the long form** (`play.mureforge.com:44406@wss://ws.mureforge.com`),
  never as the bare domain: the domain form makes the client call `register.` and `api.<domain>`,
  and `api.mureforge.com` is our website backend.
- **The proxy dials the public addresses; the web VPS joins no tunnel.** The connect server hands
  out each game server's public IP; a connect server reached over `10.8.0.1` would make the client
  try `10.8.0.1:<port>` for Inferno's servers too, and Inferno's ports exist on Molten as well.
  Keeping the box out of WireGuard also keeps the tunnel-only admin API (8080) and Postgres (5432)
  of both realms unreachable from it.
- **Both containers bind 127.0.0.1 only**, on 8730/8731. TLS, security headers, per-address
  limits and the Origin check live in the host nginx.
- **Images are built in CI** (`.github/workflows/reforge-images.yml`) and pinned by sha tag in
  `.env`. The box never runs `bun`, `vite build` or `docker build`.
- **Proxy features off:** `LOG_PACKETS` (dumps logins), `TRACK` (journals every chat/whisper, GM
  stream), `ADMIN_OPEN`/`ADMIN_DEMO` (dev seams), `BAND` (C1 FA = our Item Collections), `PING`,
  `PRESENCE` (decrypts every login for a cash shop we do not run). The proxy image refuses to start
  with an empty `ALLOW_TARGETS`.
- **Connect server: an exemption, not a higher limit.** The 44406 connect server allows 30
  simultaneous sockets per address. All web players share `WEB_VPS_IP`, so it gets listed in the
  connect server's new exempt-address list (server release, wave 4) - `MaxConnectionsPerAddress`
  stays 30 for everybody else. Raising it to 500 (the old plan) would have given every attacker
  address 500 sockets too.
- **The real client address goes to the game server by PROXY protocol v2**, once the server
  release that reads it is live on both realms: the proxy sends the header (`PROXY_PROTOCOL=v2`),
  the game server accepts it only from `TrustedProxies = WEB_VPS_IP`. Until then the proxy runs
  with `PROXY_PROTOCOL=off` and the game server sees `WEB_VPS_IP` for every web player (S11).
- **Server-side settings are changed on the admin panel**, which writes them to the database
  directly; they are not initialization data, so no hand-written SQL is needed
  (`prod-config-changes-need-sql` does not apply). The SQL below only reads, to verify.

## Before you start

1. The `reforge` version and every client change you want live are committed on `main` of
   `PlugaruRoman/mu-reforge-client-web`, and **reforge images** is green for that commit. Note the
   commit sha: the tags are `sha-<40 hex>`.
2. The wave-4 game server release (connect server exempt-address list, PROXY protocol v2 with
   `TrustedProxies`) is live on **both** realms, deployed by `DEPLOY-FLOW.md` section 2. A closed
   beta may start before it; the public link waits for it (S3.4 explains what is missing without it).

> **Gate for the public link** (a closed beta with known testers may run without it):
> 1. **PROXY v2 is live** (S11 done on both realms, W11 shows your home address, not `WEB_VPS_IP`);
> 2. **the `WEB_VPS_IP` exemptions are removed** from Abuse Protection -> Login Ip Exempt Addresses
>    and Maximum Connections Per IP on both realms (S11 step 5). Until then one attacker behind the
>    proxy gets 120x the login-guess budget of a direct client and can lock any account by name;
> 3. Cloudflare in front of `web.` and `ws.` ("Cloudflare", below) - recommended, not required.
>
> Nobody posts the link before 1 and 2 are checked off.
3. A real account to test with (prod has no test accounts) - your own, on a character that may be
   online for a minute.
4. Commands go **one block at a time**: paste a block, wait for its output, then the next. On the
   game boxes every block starts at the login (`ssh murlocbasturma@...`, `sudo -i` once per
   session, `/root/status.sh` first).

---

## Part P - provision the web VPS

### P1. Order it

Contabo, same region as the game VPSes, **Ubuntu 24.04**, at least 4 vCPU / 8 GB / 75 GB SSD
(Cloud VPS 10 or larger; `compose.yml`'s CPU and memory caps assume that size). SSH key at order
time if the panel offers it. Write the IPv4 down: it is `WEB_VPS_IP` from here on. Optional:
reverse DNS `web.mureforge.com` in the Contabo panel.

From the Windows machine, the key you log in with (create one if needed):

```powershell
ssh-keygen -t ed25519 -f $HOME\.ssh\mureforge_web -C "murlocbasturma@mureforge-web"
Get-Content $HOME\.ssh\mureforge_web.pub
```

### P2. First login, the admin user

Contabo hands over a root password. Log in once as root:

```bash
ssh root@WEB_VPS_IP
```

```bash
hostnamectl set-hostname mureforge-web
adduser --gecos "" murlocbasturma
usermod -aG sudo murlocbasturma
install -d -m 700 -o murlocbasturma -g murlocbasturma /home/murlocbasturma/.ssh
nano /home/murlocbasturma/.ssh/authorized_keys     # paste the .pub line from P1
chown murlocbasturma:murlocbasturma /home/murlocbasturma/.ssh/authorized_keys
chmod 600 /home/murlocbasturma/.ssh/authorized_keys
```

**Keep this root session open** until P3's test login works in a second window.

### P3. SSH: keys only, no root

Ubuntu 24.04's cloud image may ship `/etc/ssh/sshd_config.d/50-cloud-init.conf` with
`PasswordAuthentication yes`; sshd takes the **first** value it reads and reads that folder in
name order, so ours is `00-`:

```bash
cat > /etc/ssh/sshd_config.d/00-mureforge.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
MaxAuthTries 3
X11Forwarding no
EOF
sshd -t && systemctl restart ssh
sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|authenticationmethods) '
```

Expected: `permitrootlogin no`, `passwordauthentication no`, `kbdinteractiveauthentication no`,
`authenticationmethods publickey`. Now, **in a second window**:

```powershell
ssh -i $HOME\.ssh\mureforge_web murlocbasturma@WEB_VPS_IP
```

```bash
sudo -i
whoami
```

`root`. Only then close the first window. From now on the box is reached as
`ssh murlocbasturma@WEB_VPS_IP` + `sudo -i`, like the game boxes. Contabo's VNC console reaches it
if SSH is ever locked out.

### P4. Firewall: 22, 80, 443

```bash
ufw default deny incoming
ufw default allow outgoing
ufw limit 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose
```

Docker's published ports bypass ufw (they are NAT rules in front of `INPUT`); that is why
`compose.yml` publishes on `127.0.0.1` only. Never publish a container on `0.0.0.0` here.

**Per-source caps on 443.** nginx's `limit_conn`/`limit_req` count a request only once its headers
are in; idle TCP connections and slow TLS handshakes are capped only by the kernel. Two rules in
ufw's own `before.rules` (so `ufw reload` keeps them): at most 256 open connections per source
address on 443 (30 websockets + an HTTP/2 page load + headroom), and at most 60 new ones a second
(burst 120). A browser opens a handful; only a flood comes near either:

```bash
cp /etc/ufw/before.rules /etc/ufw/before.rules.bak-$(date +%F)
grep -q 'mureforge-443' /etc/ufw/before.rules || sed -i '/^# End required lines/a\
# mureforge-443: per-source caps on new HTTPS connections (runbook.md, P4)\
-A ufw-before-input -p tcp --dport 443 --syn -m connlimit --connlimit-above 256 --connlimit-mask 32 -m comment --comment mureforge-443 -j REJECT --reject-with tcp-reset\
-A ufw-before-input -p tcp --dport 443 --syn -m hashlimit --hashlimit-name mureforge-443 --hashlimit-mode srcip --hashlimit-above 60/sec --hashlimit-burst 120 -m comment --comment mureforge-443 -j DROP' /etc/ufw/before.rules
ufw reload
iptables -S ufw-before-input | grep mureforge-443
```

Expected: the two rules. Rollback: `cp /etc/ufw/before.rules.bak-<date> /etc/ufw/before.rules && ufw reload`.
**With Cloudflare in front** ("Cloudflare", below) every browser arrives from a few Cloudflare
addresses, and these per-source caps would throttle Cloudflare itself: remove them in that step.

### P5. Base packages, time, swap, unattended upgrades, fail2ban

```bash
apt-get update && apt-get -y full-upgrade
apt-get -y install unattended-upgrades fail2ban nginx certbot ca-certificates curl gnupg vnstat jq
timedatectl set-ntp true
timedatectl | grep -E 'System clock synchronized|NTP service'
```

Expected: `System clock synchronized: yes`, `NTP service: active` (systemd-timesyncd). TLS and
the game's own timestamps both need a correct clock.

Swap (2 GB; a short memory spike swaps instead of waking the OOM killer, which would pick the
proxy and drop every web player):

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/90-mureforge.conf && sysctl --system >/dev/null
swapon --show; free -h | head -2
```

Security updates daily, **no automatic reboot** (a reboot drops every web player - reboot by
hand, announced, when `/var/run/reboot-required` exists):

```bash
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
cat > /etc/apt/apt.conf.d/52mureforge-unattended <<'EOF'
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
unattended-upgrade --dry-run 2>&1 | tail -3
```

fail2ban for SSH. **`backend = systemd` is required on 24.04**: the default watches
`/var/log/auth.log`, which 24.04 no longer writes, and the jail silently sees nothing (the game
boxes learned this):

```bash
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
banaction = ufw

[sshd]
enabled = true
backend = systemd
EOF
systemctl enable --now fail2ban && systemctl restart fail2ban
fail2ban-client status sshd
```

### P6. Docker (official repository)

Ubuntu's `docker.io` lags; Docker's own apt repository is the standard install. Not any script
from this repository.

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Daemon defaults: log rotation for every container, and `live-restore`, so a Docker engine
upgrade does not restart the containers (and drop the web players):

```bash
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "3" },
  "live-restore": true
}
EOF
systemctl restart docker
docker info --format '{{.LoggingDriver}} live-restore={{.LiveRestoreEnabled}}'
docker version --format '{{.Server.Version}}'; docker compose version
```

### P7. nginx: connections and the default site

Ubuntu's nginx allows 768 connections per worker. The relay alone may hold 2000 websockets, each
two connections (client + upstream), plus the static site. The listen backlog of 4096
(`mureforge-webclient-http.conf`) only takes effect when the kernel allows that much
(`net.core.somaxconn`; SYN cookies stay on, Ubuntu's default):

```bash
sed -i 's/^\(\s*worker_connections\s\+\)[0-9]\+;/\116384;/' /etc/nginx/nginx.conf
grep -q '^worker_rlimit_nofile' /etc/nginx/nginx.conf || sed -i '/^worker_processes/a worker_rlimit_nofile 65536;' /etc/nginx/nginx.conf
grep -nE 'worker_(processes|connections|rlimit_nofile)|server_tokens|keepalive_timeout' /etc/nginx/nginx.conf
cat > /etc/sysctl.d/91-mureforge-net.conf <<'EOF'
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_syncookies = 1
EOF
sysctl --system >/dev/null; sysctl net.core.somaxconn net.ipv4.tcp_syncookies
rm -f /etc/nginx/sites-enabled/default
nginx -v; nginx -t
```

Expected: `worker_connections 16384;`, `worker_rlimit_nofile 65536;`, nginx 1.24 (24.04's),
`net.core.somaxconn = 4096`, `net.ipv4.tcp_syncookies = 1`. Our vhosts set `keepalive_timeout`,
`client_header_timeout` and friends per server, so a `keepalive_timeout 65;` in `nginx.conf` may
stay (the server value wins).
Removing `default` matters: it is a `default_server` on `[::]:80` and `:80`; our own catch-all
(W7) replaces it. `systemctl reload nginx` comes with W7.

---

## Part S - game servers (Molten, then Inferno)

Nothing here restarts a game server. Saving the plug-in settings applies them live.

### S1. Molten: preflight

```bash
ssh murlocbasturma@169.58.146.212
```

```bash
sudo -i
hostname; ip -4 -o addr show wg0 | grep -oE '10\.8\.0\.[0-9]+'
/root/status.sh
export WEB_VPS_IP=<the address from P1>
[ -n "$WEB_VPS_IP" ] && echo "WEB_VPS_IP=$WEB_VPS_IP" || echo "STOP: set WEB_VPS_IP"
```

Read back: `vmi3495783` and `10.8.0.1`. Anything else - stop, you are on the wrong box.

### S2. Molten: read ports, limits and the firewall (read-only)

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

-- The same, filtered to the client the web client speaks (Season 106 = "Season 6 Episode 3 Open
-- Source Client", version 20404) and ready to paste: the published port is the alternative one
-- when it is set. One line, three ports - these replace Molten's CHANGEME in proxy.env (W4).
SELECT string_agg(
         (CASE WHEN e."AlternativePublishedPort" > 0 THEN e."AlternativePublishedPort"
               ELSE e."NetworkPort" END)::text, ',' ORDER BY g."ServerID") AS os_ports,
       count(*) AS servers
FROM config."GameServerEndpoint" e
JOIN config."GameServerDefinition" g ON g."Id" = e."GameServerDefinitionId"
JOIN config."GameClientDefinition" c ON c."Id" = e."ClientId"
WHERE c."Season" = 106 AND c."Episode" = 3;

-- The chat server's port (friend chat rooms; the web client always dials 55980).
SELECT ce."NetworkPort", c."Description" AS client
FROM config."ChatServerEndpoint" ce
LEFT JOIN config."GameClientDefinition" c ON c."Id" = ce."ClientId";

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
iptables -S DOCKER-USER
fail2ban-client get authelia ignoreip
```

Write down:
- the `os_ports` line (`servers` = 3) - Molten's OS ports. It must agree with the rows of the
  first query whose client is **Season 6 Episode 3 Open Source Client**. The server assigns ports
  in no fixed order, so never take them from an older note or the example file;
- the chat server's `NetworkPort`: `55980` (any other value: stop - the web client cannot reach
  it, `chatRoomProtocol.ts` hard-codes 55980);
- the `curl` line is Inferno's list as Molten sees it: its OS endpoints are Inferno's OS ports
  (cross-checked in S7);
- `MaxConnectionsPerAddress` of the 44406 row (default 30) - it stays as it is;
- which of the three plug-ins is `IsActive`, and their JSON (Refuse Login on or off);
- the `DOCKER-USER` rules: normally only fail2ban's `-j f2b-authelia` jump and `-j RETURN`. Any
  `connlimit`/`hashlimit`/`recent` rule on 44406 or 559xx is a manual per-address throttle that
  would treat all web players as one address - S6 handles it;
- the `ignoreip` list, for S5.

### S3. Molten: admin panel

`https://panel-k7m2q9.mureforge.com` (Authelia + TOTP).

1. **Plugins** (`/plugins`) -> **Require Launcher** -> configuration -> **Exempt Addresses**:
   append `;WEB_VPS_IP` to the existing value (keep `127.0.0.1;::1;192.168.*;10.*`). No `*`: the
   exemption must match this one address exactly. Save.
2. **Plugins** -> **Maximum Connections Per IP** (disabled by default): if it is **active**, add
   `WEB_VPS_IP` to **Exempt Ip Addresses** (semicolon separated). Until PROXY protocol is on
   (S11), every web player shares that address; without the exemption the 4th web player is told
   "the server is full". If inactive, change nothing.
3. **Plugins** -> **Maximum Sessions Per Machine**: **Refuse Without Machine Id must stay off.**
   The web client sends no machine id (`C1 E7 00`); with it on, every web login is refused.
   Nothing to change, only check.
4. **Servers** (`/servers`) -> the connect server **Season 6 Episode 3 Open Source Client** (port
   44406) -> edit -> **Max Connections Per Address: Exempt Addresses** (wave-4 server release,
   column `MaxConnectionsPerAddressExemptions`; addresses or CIDR ranges, `;`-separated) ->
   `WEB_VPS_IP`. Leave **Check Max Connections Per Address** on and **Max Connections Per
   Address** at `30`: every other address keeps that limit. (Once S11 is done the connect server
   counts web players by their real addresses and this exemption is no longer used; it does no
   harm to keep it.)
   - Saving a connect server definition restarts the listeners of **all** connect servers (44405
     and 44406) inside the running process: players already in game are not touched, players on
     the server-select screen at that moment get a connection error and retry. Do it off-peak.
   - The plug-in reads the list for every accepted connection, so no restart is needed for it.
     If W11 ever shows `Maximum Connections per IP reached: WEB_VPS_IP` anyway, it did not take:
     the value goes live at the latest with the next normal game release (DEPLOY-FLOW section 2) -
     never restart for it. Without it, all web players together share **30 simultaneous
     connect-server sockets** (each player holds one from the server list until a successful
     login, password typing included): fine for a closed beta, not for the public link.
5. Nothing on **Runtime Guard**: it challenges only clients that sent a machine id, so web players
   are never challenged and never scored for silence.
6. **Plugins** -> **Abuse Protection** (wave-4 server release; active by default, its configuration
   is created with the defaults on the first start of that release) -> **Login Ip Exempt
   Addresses** -> `WEB_VPS_IP`. Until PROXY protocol is on (S11) every web player shares that
   address, and `MaxFailedLoginsPerIp` (30 in 10 min) would lock **all** web logins for 10 minutes
   after 30 typos among them. The per-connection (3) and per-account (5 / 10 min -> 15 min) limits
   still apply to web players. Leave the other values at their defaults; the packet limit
   (`PacketsPerSecond` 150 / `PacketBurst` 600) is an estimate - after the release, grep the game
   log for `more than` + `packets` (closed connections) during MU Helper / area-skill play before
   tightening anything. Once S11 is live the exemption **must** go (S11 step 5): the IP limit
   then counts real player addresses.
7. The wave-4 server release also caps **connections per address that have not logged in yet**
   (the slot-exhaustion fix; exact plug-in / setting name in
   `mu-reforge-server/deploy/prod/WEB-CLIENT.md`). Until S11 every web player is `WEB_VPS_IP`, so
   add `WEB_VPS_IP` to that cap's exempt addresses, or the web players logging in at the same
   moment share one small budget. Removed again in S11 step 5.

### S4. Molten: verify the panel wrote it

```bash
cd /root/mu-reforge-server/deploy/prod
docker exec -i database psql -U postgres -d openmu <<'SQL'
SELECT "TypeId", "IsActive", "CustomConfiguration"
FROM config."PlugInConfiguration"
WHERE "TypeId" IN ('6e1f1d6c-0f26-4e5a-9e7c-6a4e2c7a9b31', '2c779f5e-379e-4ce0-bfcc-ca6455d757b3');
SELECT * FROM config."ConnectServerDefinition" WHERE "ClientListenerPort" = 44406;
SQL
```

The Require Launcher JSON contains `WEB_VPS_IP`; the 44406 row still says `30` for
`MaxConnectionsPerAddress` and carries `WEB_VPS_IP` in `MaxConnectionsPerAddressExemptions`.

### S5. Molten: fail2ban never bans the web VPS

The `authelia` jail bans with `iptables-allports` in `DOCKER-USER`: a ban of `WEB_VPS_IP` would
cut every web player off every game port. The web VPS never talks to Authelia, so this is belt
and braces. A jail-level `ignoreip` **replaces** the default list, so the line carries what S2
printed plus our address - check the composed line before writing it:

```bash
CUR="$(fail2ban-client get authelia ignoreip | sed -n 's/^[|`]- *//p' | tr '\n' ' ')"
LINE="$(echo "$CUR 10.8.0.0/24 $WEB_VPS_IP" | tr ' ' '\n' | grep -v '^$' | awk '!seen[$0]++' | tr '\n' ' ')"
echo "ignoreip = $LINE"
```

If that line holds the old entries, `10.8.0.0/24` and `WEB_VPS_IP` (and nothing odd), write it:

```bash
cat > /etc/fail2ban/jail.d/zz-webclient-ignore.local <<EOF
# Web client VPS and the WireGuard peers. See deploy/prod/WEB-CLIENT.md.
[authelia]
ignoreip = $LINE
EOF
fail2ban-client reload authelia
fail2ban-client get authelia ignoreip
fail2ban-client status authelia | head -5
```

### S6. Molten: DOCKER-USER - only if S2 showed per-address throttles

Skip this step when S2 printed only fail2ban's jump and `RETURN`. If a manual
`connlimit`/`hashlimit` rule limits 44406 or the game ports per address, the web VPS needs to pass
it - a small unit re-inserts the allow rule at boot, idempotently (the rule is checked with `-C`
before it is inserted, so running it twice changes nothing):

```bash
cat > /etc/systemd/system/mureforge-webclient-allow.service <<EOF
[Unit]
Description=Let the web client VPS past per-address game port throttles (DOCKER-USER)
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/sh -c 'iptables -C DOCKER-USER -s $WEB_VPS_IP -p tcp -m multiport --dports 44406,55901:55906,55980 -j RETURN 2>/dev/null || iptables -I DOCKER-USER 1 -s $WEB_VPS_IP -p tcp -m multiport --dports 44406,55901:55906,55980 -j RETURN'
ExecStop=/bin/sh -c 'iptables -D DOCKER-USER -s $WEB_VPS_IP -p tcp -m multiport --dports 44406,55901:55906,55980 -j RETURN 2>/dev/null || true'

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now mureforge-webclient-allow.service
iptables -S DOCKER-USER | head -5
```

`RETURN` hands the packet back to Docker's own chains (the normal path), skipping only what comes
after it in `DOCKER-USER`. A fail2ban ban inserted later lands **above** it, which is why S5 is not
optional. The kill switch's `DROP` is inserted at position 1 and always wins.

The ports include the chat server (55980): friend chat rooms of web players open their own socket
to it, from `WEB_VPS_IP` like everything else.

### S6b. Optional hardening: per-source caps on the game ports (both realms)

Not web-specific, and not needed for the web client to work - but the cheapest attack on the
game today: before login nothing limits sockets per address, so **one address opening 1000 TCP
sockets fills a game server** ("The server is full" for everybody) and repeats after the 5-minute
pre-login timeout. These rules cap every source at **30 concurrent connections** and **30 new
connections a minute (burst 60)** over all game ports together; `WEB_VPS_IP` and the WireGuard
peers are exempt first, because every web player arrives as `WEB_VPS_IP` until S11.

> **Warning - shared addresses.** An internet cafe, a university or a mobile carrier's CGNAT puts
> many players behind ONE address. A desktop player holds 2-3 sockets (connect server, game
> server, chat), so 30 is about 10 players per address; the 11th gets a connection error that
> looks like a dead server. Before switching it on, check the game log for addresses with many
> concurrent players; if a known cafe or carrier shows up, raise 30 (or exempt it with another
> `RETURN` line) - never just hope. Watch `/cheat-violations` and the player reports the first
> days, and roll back at the first sign.

Check first that the game container publishes each port on the same number (`DOCKER-USER` sees
the packet after Docker's DNAT, so it matches the container port):

```bash
docker port openmu-startup | sort
```

Every line must read `<p>/tcp -> 0.0.0.0:<p>` (same number both sides). If one does not, stop
and adapt the port list. Then the unit (same pattern as S6; `ExecStart` is idempotent):

```bash
cat > /usr/local/sbin/mureforge-game-limits.sh <<EOF
#!/bin/sh
# Per-source caps on the game ports (runbook S6b). Rebuilt from scratch on every start.
P=44405,44406,55901:55906,55980
iptables -D DOCKER-USER -p tcp -m multiport --dports \$P -j MU-GAME-LIMIT 2>/dev/null
iptables -F MU-GAME-LIMIT 2>/dev/null || iptables -N MU-GAME-LIMIT
iptables -A MU-GAME-LIMIT -s $WEB_VPS_IP -j RETURN
iptables -A MU-GAME-LIMIT -s 10.8.0.0/24 -j RETURN
iptables -A MU-GAME-LIMIT -s 169.58.146.212 -j RETURN
iptables -A MU-GAME-LIMIT -s 169.58.207.145 -j RETURN
iptables -A MU-GAME-LIMIT -p tcp --syn -m connlimit --connlimit-above 30 --connlimit-mask 32 -j REJECT --reject-with tcp-reset
iptables -A MU-GAME-LIMIT -p tcp --syn -m hashlimit --hashlimit-name mu-game-new --hashlimit-mode srcip --hashlimit-above 30/min --hashlimit-burst 60 -j DROP
iptables -A MU-GAME-LIMIT -j RETURN
iptables -I DOCKER-USER 1 -p tcp -m multiport --dports \$P -j MU-GAME-LIMIT
EOF
chmod 755 /usr/local/sbin/mureforge-game-limits.sh
cat /usr/local/sbin/mureforge-game-limits.sh
```

Read the script back: the first `RETURN` line must carry the real web VPS address, not an empty
`-s`. Then:

```bash
cat > /etc/systemd/system/mureforge-game-limits.service <<'EOF'
[Unit]
Description=Per-source caps on the MU game ports (DOCKER-USER -> MU-GAME-LIMIT)
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/sbin/mureforge-game-limits.sh
ExecStop=/bin/sh -c 'iptables -D DOCKER-USER -p tcp -m multiport --dports 44405,44406,55901:55906,55980 -j MU-GAME-LIMIT 2>/dev/null; iptables -F MU-GAME-LIMIT 2>/dev/null; iptables -X MU-GAME-LIMIT 2>/dev/null; true'

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now mureforge-game-limits.service
iptables -S DOCKER-USER | head -5; iptables -S MU-GAME-LIMIT
```

Expected: the jump to `MU-GAME-LIMIT` at the top of `DOCKER-USER` (a later fail2ban ban or the
kill switch's `DROP` inserted at 1 still comes first), and the chain with the four `RETURN`s
(web VPS, WireGuard, both realm addresses), the
`connlimit` and the `hashlimit` rule. Players already connected are not touched (the rules match
only new SYNs). Log in once with the desktop client right after.

**Rollback** (immediate, no restart of anything): `systemctl disable --now mureforge-game-limits.service`,
then `iptables -S DOCKER-USER | grep -c MU-GAME-LIMIT` must print `0`.

### S7. Inferno: preflight, ports and plug-ins (read-only)

```bash
ssh murlocbasturma@169.58.207.145
```

```bash
sudo -i
hostname; ip -4 -o addr show wg0 | grep -oE '10\.8\.0\.[0-9]+'
/root/status.sh
export WEB_VPS_IP=<the address from P1>
[ -n "$WEB_VPS_IP" ] && echo "WEB_VPS_IP=$WEB_VPS_IP" || echo "STOP: set WEB_VPS_IP"
```

Read back: `inferno` and `10.8.0.3`. Then:

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
iptables -S DOCKER-USER
fail2ban-client get authelia ignoreip
```

Run S2's `os_ports` and chat server queries here too (same SQL). Inferno's OS ports = that
`os_ports` line (ids 20-22); they replace Inferno's CHANGEME in proxy.env (W4) and must agree with
what Molten's `curl` showed in S2. The chat server must be `55980` here as well.

### S8. Inferno: admin panel

`https://panel-x7q2m.inferno.mureforge.com` - S3.1, S3.2, S3.3, S3.6 and S3.7 exactly as on Molten.
Skip S3.4: web players reach Inferno's game servers through **Molten's** connect server. (Only if
Inferno's connect server is ever added as a fall-back world line in `serverlist.md`: add
`WEB_VPS_IP` to its exempt list too and `169.58.207.145:44406` to `ALLOW_TARGETS`.)

### S9. Inferno: verify, fail2ban, DOCKER-USER

S4's SQL (the plug-in half), then S5 verbatim on this box, then S6 only if S7 showed throttles,
and S6b if it was done on Molten (both realms the same way).

### S10. Both realms: what changes with PROXY protocol (later, S11)

Nothing yet. The steps above are complete for `PROXY_PROTOCOL=off`. S11 is run once, after the
web VPS is live (Part W) and the wave-4 server release runs on both realms.

### S11. PROXY protocol v2 - the switch (server first, then the proxy)

The game server can then see each web player's real address; per-address plug-ins work for web
players again, and bans or investigations by IP become possible. **Order, strictly:**

1. The server release that reads PROXY v2 runs on **Molten and Inferno** (DEPLOY-FLOW section 2,
   its normal restart - nothing extra here).
2. On **both** admin panels, ahead of the window: **Plugins -> Require Launcher -> Exempt Web
   Sessions** = on. Once the server sees real addresses, the address exemption (`WEB_VPS_IP`) no
   longer matches web players; this switch exempts sessions that arrived through a trusted proxy
   instead. Harmless before step 3 (no session arrives that way yet).
3. **One quiet window, steps a-c back to back** (the server *requires* the header from a trusted
   peer and never parses one from anybody else, so between a and b no new web login works;
   players already connected are not touched by a):
   a. Both admin panels: **Configuration -> System -> Trusted Proxies** = `WEB_VPS_IP` (exact
      address; `;`-separated list, CIDR allowed). Applies live, no restart.
   b. Web VPS: `PROXY_PROTOCOL=v2` in `/opt/mureforge-webclient/proxy.env`, then
      `docker compose up -d proxy` - **this disconnects every web player** (saved by the normal
      logout path); announce it like a restart. Leave the proxy's own `TRUSTED_PROXIES`
      (whom it believes `X-Real-IP` from: the docker bridge where host nginx comes from) at the
      image default.
   c. Log in through the web client.
4. Verify: on the game box look for **your own home address**, not `WEB_VPS_IP` (W11's `grep`
   with your address), and no `has no launcher clearance` for it. Maximum Connections Per IP now
   counts web players by their own addresses; its `WEB_VPS_IP` exemption can go. Keep `WEB_VPS_IP`
   in Require Launcher's Exempt Addresses and in the connect server exemption until a week runs
   clean - they cost nothing and are the fallback for step "Rollback of the switch".
5. **Remove the per-address exemptions that let one attacker hide behind the proxy** - on both
   panels, the same day as step 4 (this is the public-link gate, "Before you start"):
   - **Abuse Protection -> Login Ip Exempt Addresses**: remove `WEB_VPS_IP`. The failed-login limit
     per address then counts each web player's own address (without this, one address behind the
     proxy gets 120x the guessing budget and can lock any account by name);
   - **Maximum Connections Per IP -> Exempt Ip Addresses** (if the plug-in is active): remove it;
   - the **pre-login connection cap per address** (wave-4 server release; see
     `mu-reforge-server/deploy/prod/WEB-CLIENT.md` for its exact name on the panel): remove
     `WEB_VPS_IP` from its exempt list.
   Log in through the web client once more; the game log must show no refusal for your address.
   If PROXY v2 is ever rolled back, these exemptions must come back **before** the proxy switch
   (otherwise the 31st failed web login locks every web player for 10 minutes).

Rollback of the switch: first put `WEB_VPS_IP` back into the exempt lists step 5 removed, then
`PROXY_PROTOCOL=off` + `docker compose up -d proxy`, and right after it Trusted Proxies empty on
both panels (again one window: in between web logins fail). Exempt Web Sessions may stay on.

---

## Part W - the web VPS

### W1. DNS

Contabo DNS panel, zone `mureforge.com`: two A records, TTL 300.

| Name | Type | Value |
|---|---|---|
| `web` | A | `WEB_VPS_IP` |
| `ws` | A | `WEB_VPS_IP` |

No AAAA (Decisions, "IPv4 only"). Touch nothing else (apex, `www`, MX, `play`, `patch`, `auth`,
`panel-*`, the wildcard). Verify authoritatively, never with a cached resolver:

```bash
dig +short @ns1.contabo.net web.mureforge.com
dig +short @ns1.contabo.net ws.mureforge.com
dig +short @ns1.contabo.net AAAA web.mureforge.com
dig +short @ns1.contabo.net play.mureforge.com
```

The first two print `WEB_VPS_IP`, the third nothing, the fourth still `169.58.146.212`.

### W2. Preflight

```bash
ssh murlocbasturma@WEB_VPS_IP
```

```bash
sudo -i
hostname; ufw status | head -8
sshd -T | grep -E '^(permitrootlogin|passwordauthentication) '
fail2ban-client status sshd | head -4
nginx -v; nginx -t
docker version --format '{{.Server.Version}}'; docker compose version
ss -ltnp | grep -E ':(80|443|8730|8731)\b' || echo "80/443/8730/8731 free"
ls /etc/nginx/sites-enabled/
df -h / | tail -1; free -h | head -2; swapon --show
timedatectl | grep 'synchronized'
```

Read back: `mureforge-web`; ufw active with 22 (LIMIT), 80, 443 only; `permitrootlogin no`,
`passwordauthentication no`; the sshd jail running; `nginx -t` ok; Docker running; nothing on the
four ports (nginx listens on nothing yet with the default site gone) and `sites-enabled` empty;
at least 20 GB free (the web image is a few GB, and the previous one stays for rollback); swap 2G;
clock synchronized.

### W3. Files onto the box

From the Windows machine (PowerShell), the deploy folder of this repository:

```powershell
scp -r D:\Development\babylon\deploy\reforge murlocbasturma@WEB_VPS_IP:/home/murlocbasturma/webclient-kit
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

### W4. Fill in `.env` and `proxy.env`

With the values from S2/S7 and the CI run:

```bash
nano .env        # WEB_IMAGE / PROXY_IMAGE = ...:sha-<the commit sha>
nano proxy.env   # ALLOW_TARGETS: each CHANGEME -> the os_ports S2 (Molten) and S7 (Inferno) printed
grep -E '^(WEB_IMAGE|PROXY_IMAGE)=' .env
grep -E '^(ALLOW_TARGETS|PROXY_PROTOCOL|LOG_PACKETS|TRACK|ADMIN_OPEN|ADMIN_DEMO|BAND|PING|PRESENCE)=' proxy.env
grep -c CHANGEME proxy.env
```

Expected: both images end in the same `sha-...`; `ALLOW_TARGETS` holds `play.mureforge.com:44406`,
`169.58.146.212:44406`, the three `os_ports` of each realm on its IP, and `:55980` on **both**
realm IPs (the chat server); `PROXY_PROTOCOL=off` (S11 turns it on); every other switch reads
`off`; the `CHANGEME` count is `0` - the proxy refuses to start while one is left.

### W5. Registry login

ghcr packages start **private** on their first publish, even for a public repository, so this is
normally needed. A classic PAT with only `read:packages`:

```bash
echo '<PAT>' | docker login ghcr.io -u PlugaruRoman --password-stdin
```

(Or make both packages public on GitHub: Packages -> package settings -> visibility.)

### W6. Containers

```bash
cd /opt/mureforge-webclient
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail 30 proxy
curl -s -o /dev/null -w 'build.json %{http_code}\n' http://127.0.0.1:8731/build.json
curl -s -o /dev/null -w 'gz sidecar %{http_code} %{content_type}\n' http://127.0.0.1:8731/Data-reforge/Item/Cape_Bronze25_0.OZT.gz
curl -s http://127.0.0.1:8730/server.json; echo
```

Both containers `healthy` (give them 30 s). The proxy log shows `allowed targets: play.mureforge.com:44406, ...`,
`track: off`, `band: off`, `ping: off`, a `limits:` line ending in
`30 sockets/ip, 2000 sockets total` and **no** `ALLOW_TARGETS is unset` warning. The pinned
compose network (the proxy believes `X-Real-IP` only from its gateway):

```bash
docker network inspect mureforge-webclient_default -f '{{range .IPAM.Config}}{{.Subnet}} gw {{.Gateway}}{{end}}'
docker inspect -f '{{.HostConfig.Memory}}' mureforge-webclient-proxy
```

Expected `172.31.250.0/24 gw 172.31.250.1` and `3221225472` (3g). If `up` failed with "Pool
overlaps with other one on this address space", another network took that range: pick a free
/24, put it and its `.1` gateway into `compose.yml`, and `TRUSTED_PROXIES=127.0.0.1,::1,<that .1>`
into `proxy.env`. `build.json` 200;
the sidecar 200 `application/octet-stream` (the Hero Cape's cloth: it proves `Data-reforge/` was
copied whole and compressed); `server.json` a document with
`"modulesOff":["band","marketplace"]`.

If `web` keeps restarting with `operation not permitted` in `docker compose logs web`, the image's
nginx needs one more capability than `compose.yml` grants; note the message and add that one cap -
never remove `cap_drop`.

### W7. HTTP vhost, catch-all and certificate

```bash
cp /home/murlocbasturma/webclient-kit/nginx/host/mureforge-webclient-http.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/mureforge-webclient-http.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
curl -sI http://web.mureforge.com/ | head -3
curl -s -o /dev/null -w 'bare IP: %{http_code}\n' http://WEB_VPS_IP/ || true
```

Expect `301` to `https://web.mureforge.com/`, and the bare IP answers nothing (`000`, the
connection is closed). Then the certificate (webroot, so certbot edits no nginx file; the deploy
hook reloads nginx on every renewal):

```bash
certbot certonly --webroot -w /var/www/letsencrypt --cert-name mureforge-webclient \
  -d web.mureforge.com -d ws.mureforge.com \
  --deploy-hook "systemctl reload nginx" \
  --agree-tos -m admin@mureforge.com --no-eff-email
ls /etc/letsencrypt/live/mureforge-webclient/
systemctl list-timers | grep -i certbot
certbot renew --cert-name mureforge-webclient --dry-run
```

(Use the address that should receive Let's Encrypt's expiry mails.)

### W8. HTTPS vhosts

```bash
cp /home/murlocbasturma/webclient-kit/nginx/host/web.mureforge.com.conf /etc/nginx/sites-available/
cp /home/murlocbasturma/webclient-kit/nginx/host/ws.mureforge.com.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/web.mureforge.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/ws.mureforge.com.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

A `nginx -t` failure leaves the running config untouched; read the message first.

### W9. Verify - the static site and the relay

```bash
# Static site: index no-cache, the security headers, hashed bundle immutable, a missing file 404.
curl -sI https://web.mureforge.com/ | grep -iE '^(HTTP|cache-control|strict-transport|content-security-policy|x-content-type|referrer-policy|x-frame)'
curl -s https://web.mureforge.com/build.json; echo
curl -s https://web.mureforge.com/serverlist.md | grep REFORGE
A=$(curl -s https://web.mureforge.com/ | grep -oE 'assets/[^"]+\.js' | head -1); echo "$A"
curl -sI "https://web.mureforge.com/$A" | grep -iE '^(HTTP|cache-control)'
curl -sI https://web.mureforge.com/Data-reforge/Item/Cape_Bronze25_0.OZT | grep -iE '^(HTTP|cache-control)'
curl -sI https://web.mureforge.com/Data-reforge/Item/Cape_Bronze25_0.OZT.gz | grep -iE '^(HTTP|content-type|content-encoding)'
curl -sI https://web.mureforge.com/Data/does-not-exist.bmd | head -1
# The relay: manifest, a refused origin, a refused target, a real handshake.
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

Expected:
- `HTTP/2 200`, `cache-control: no-cache`, `strict-transport-security`,
  `content-security-policy-report-only`, `x-content-type-options: nosniff`, `referrer-policy`,
  `x-frame-options`;
- the build id; the REFORGE line; the bundle with `max-age=31536000, immutable`;
- the Hero Cape texture `200` with `max-age=86400`, its sidecar `200`,
  `application/octet-stream` and **no** `content-encoding`;
- `404` for the missing file (never 200);
- the manifest; `no origin: 403`; `bad target: 403`; `HTTP/1.1 101 Switching Protocols`.

### W10. Verify - in the browser

A private window (no old cache), devtools open: `https://web.mureforge.com`, pick **Mu Reforge**,
a Molten channel, log in with your account, enter the game, walk, open the inventory, change map
once, log out. Repeat on an Inferno channel.

- Console: **no** `Content-Security-Policy` report lines (Report-Only logs them, it blocks
  nothing). Every one is a source the page really uses and the CSP lacks: note it, add it to
  `web.mureforge.com.conf`, redeploy the vhost (W8) - before the policy is ever switched to
  enforcing.
- Network: no `429` and no `404` on `Data-reforge/` or `game-assets-reforge/` files.
- Application -> Service Workers: `sw.js?build=...` active; after the pre-download, a reload serves
  `Data-reforge/...` and `game-assets-reforge/...` "from ServiceWorker".

### W11. Verify - on the game boxes

While logged in, on **Molten** (S1 login). The game server runs in its container's network
namespace; `ss` on the host does not see those sockets (the traffic is DNAT-ed into the
container), so look from inside it:

```bash
P=$(docker inspect -f '{{.State.Pid}}' openmu-startup)
nsenter -t "$P" -n ss -tn state established | grep -c "$WEB_VPS_IP"
grep -h "$WEB_VPS_IP" /root/mu-reforge-server/deploy/prod/data/logs/log$(date +%Y%m%d)*.txt | tail -5
```

The count is at least 1 while you are connected. The log must **not** show `has no launcher
clearance`, `Maximum Connections per IP reached` or `refused` for `WEB_VPS_IP`; if it does, S3
did not take (check S4). The same on Inferno after the Inferno login (`P` from Inferno's
`openmu-startup`).

Last, on the web VPS: `docker compose logs --since 10m proxy | grep -E "refused target|tcp connect error"`
- empty is the good answer. A `refused target 169.58.x.x:559xx` (or `:55980` - open a friend chat
room once to test it) means `ALLOW_TARGETS` lacks a port: fix `proxy.env` and
`docker compose up -d proxy` (no players yet, so no announcement). Then:

```bash
docker compose logs --since 10m proxy | grep 'client connected' | tail -3
```

Every line must show `ip=<your home address>`. `ip=172.31.250.1` means the proxy does not
believe nginx's `X-Real-IP` (TRUSTED_PROXIES and the compose gateway disagree, W6): every web
player then shares one address for `MAX_SOCKETS_PER_IP` and, after S11, for the game server.

Then fill the address into `mu-reforge-server/deploy/prod/WEB-CLIENT.md` (its settings table)
and commit it with the next server-repo change.

---

## Part M - monitoring

### M1. Uptime checks (external)

An external monitor (UptimeRobot, Better Stack or similar; free tier is enough), every 1-5 min,
alert to the admin's phone/e-mail:

| Check | URL | Expect |
|---|---|---|
| static site | `https://web.mureforge.com/build.json` | 200, body contains `"build"` (keyword check) |
| relay | `https://ws.mureforge.com/server.json` | 200, body contains `modulesOff` |
| certificate | either URL | expiry warning at 14 days |

`server.json` is answered by Bun itself, so it fails when the proxy is down, not only nginx. It
shares the relay's per-address request budget (60/min): one check a minute is far below it.

### M2. On the box

```bash
cd /opt/mureforge-webclient
docker compose ps                                     # both healthy
docker stats --no-stream mureforge-webclient-proxy mureforge-webclient-web
awk '$9==429' /var/log/nginx/mureforge-web.access.log | wc -l     # static 429s today
awk '$9==429' /var/log/nginx/mureforge-ws.access.log | wc -l      # relay 429s today
awk '$9==429 {print $1}' /var/log/nginx/mureforge-ws.access.log | sort | uniq -c | sort -rn | head
vnstat -m                                             # traffic this month (Contabo counts it)
df -h / | tail -1
ls /var/run/reboot-required 2>/dev/null && echo "reboot pending - announce, then reboot"
fail2ban-client status sshd | grep 'Currently banned'
```

Many 429s from one address on `ws` = a cafe or CGNAT outgrowing 30 sockets (raise
`limit_conn mu_ws_conn` and `MAX_SOCKETS_PER_IP` together) or a flood (leave it). The proxy's
memory near `PROXY_MEM` means slow clients are piling up buffered data; the proxy's own limits
(proxy/relayLimits.ts, the sum in compose.yml) should cut them first. The proxy's own refusals:

```bash
docker compose logs --since 24h proxy | grep -cE 'rate limit ip='          # frame/byte buckets (1008)
docker compose logs --since 24h proxy | grep -E 'rate limit ip=' | grep -oE 'ip=[^ :]+' | sort | uniq -c | sort -rn | head
docker compose logs --since 24h proxy | grep -cE 'MAX_SOCKETS_(PER_IP|TOTAL)'
```

During the beta a `rate limit` line for a player who was only playing (MU Helper, area skills, a
long letter) means a limit is too tight: raise `CLIENT_MSG_RATE`/`CLIENT_BYTE_RATE` in
`proxy.env`, never turn it off.

nginx logs rotate daily (Ubuntu's logrotate, 14 days); container logs by size (`compose.yml`).

---

## Cloudflare (recommended before the public link)

Without it, the web VPS's own address takes every flood: Contabo's protection is basic, and a big
one ends in a null-route of the box (only the web client goes down - the game and the website are
other boxes). Cloudflare in front of **both** `web.` and `ws.` absorbs L3/L4/L7 floods, caches
the ~450 MB of game data (bandwidth, risk R8) and hides the origin address. Both names must be
proxied: a grey-cloud `ws.` would print the origin address for anyone to flood directly.
Cloudflare proxies WebSockets on every plan.

Costs: a websocket can be reset when Cloudflare maintains an edge (the player reconnects); one more
party sees the (weakly encrypted) MU stream; and Cloudflare's terms on serving large non-HTML
files have to be read for the plan before the cache rule is turned on.

1. **Zone.** Proxying needs the zone's nameservers at Cloudflare. Recreate **every** record of the
   Contabo zone first (apex, `www`, MX, `api`, `play`, `patch`, `auth`, `panel-*`, the wildcard)
   as **DNS only** (grey) - the game ports, the patch server and the panels are not HTTP through
   Cloudflare and must keep their real addresses - then `web` and `ws` as **Proxied** (orange) to
   `WEB_VPS_IP`. Only then switch the nameservers at the registrar; check with
   `dig +short play.mureforge.com @1.1.1.1` (still `169.58.146.212`) and
   `dig +short ws.mureforge.com @1.1.1.1` (a Cloudflare address, no longer `WEB_VPS_IP`).
2. **TLS: Full (strict).** SSL/TLS -> Overview -> **Full (strict)**; never Flexible (Cloudflare would
   talk plain HTTP to the origin). The origin keeps a certificate Cloudflare validates: either the
   Let's Encrypt one, renewed by DNS-01 (certbot's `dns-cloudflare` plugin with an API token for
   this zone only) because HTTP-01 on port 80 stops working once step 4 closes it, **or** a
   Cloudflare **Origin Certificate** (SSL/TLS -> Origin Server -> create for `web.mureforge.com`
   and `ws.mureforge.com`, 15 years), saved as `/etc/ssl/mureforge-cf/origin.pem` and `origin.key`
   (`chmod 600` the key), with the two `ssl_certificate*` lines of both vhosts pointed at them.
   SSL/TLS -> Edge Certificates -> **Always Use HTTPS** on.
3. **Real client address.** Behind Cloudflare `$remote_addr` is a Cloudflare edge - every
   per-address limit (nginx zones, the proxy's `MAX_SOCKETS_PER_IP`, and with S11 the game
   server) would key on a handful of edges. nginx takes the client from `CF-Connecting-IP`,
   **believed only from Cloudflare's published ranges** (anyone else could send the header):

   ```bash
   { echo "# Cloudflare edges - generated $(date +%F) from cloudflare.com/ips; re-run when they change."
     for ip in $(curl -fsS https://www.cloudflare.com/ips-v4) $(curl -fsS https://www.cloudflare.com/ips-v6); do
       echo "set_real_ip_from $ip;"
     done
     echo "real_ip_header CF-Connecting-IP;"
   } > /etc/nginx/conf.d/cloudflare-realip.conf
   cat /etc/nginx/conf.d/cloudflare-realip.conf | head -3; grep -c set_real_ip_from /etc/nginx/conf.d/cloudflare-realip.conf
   nginx -t && systemctl reload nginx
   ```

   The vhosts already set `X-Real-IP $remote_addr`, which now is the browser, so the proxy and
   PROXY v2 need no change. Check: W11's `client connected ip=` line shows your home address.

   **IPv6.** Cloudflare accepts IPv6 browsers even though the origin is IPv4 only, so
   `CF-Connecting-IP` can be an IPv6 address - and one subscriber owns a whole /64 to rotate
   through. Key the nginx zones on the /64: in both vhosts replace `$binary_remote_addr` in the
   `limit_req_zone`/`limit_conn_zone` lines by `$mu_client_key`, defined once in
   `/etc/nginx/conf.d/mureforge-clientkey.conf`:

   ```nginx
   # The first 64 bits of an IPv6 client, the whole address of an IPv4 one.
   map $remote_addr $mu_client_key {
       "~^(?<p64>[0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}):" $p64;
       default $remote_addr;
   }
   ```

   (A prefix written with `::` inside its first four groups falls back to the whole address; the
   per-source firewall of step 4 is Cloudflare's then.) The proxy's per-address cap and, after
   S11, the game server's limits still count whole IPv6 addresses - the nginx zones are the
   /64-aware layer.
4. **Origin firewall: 443 from Cloudflare only.** Nobody else has a reason to reach the box, and a
   flood aimed at the origin address then dies at ufw:

   ```bash
   for ip in $(curl -fsS https://www.cloudflare.com/ips-v4); do ufw allow proto tcp from "$ip" to any port 443 comment cloudflare; done
   ufw delete allow 443/tcp
   ufw delete allow 80/tcp
   ufw status numbered | head -30
   ```

   Then remove P4's per-source caps on 443 (they would now throttle Cloudflare's edges):
   restore `/etc/ufw/before.rules.bak-<date>` and `ufw reload`. Port 80 stays closed (Cloudflare
   redirects to HTTPS itself; certificates come from step 2). Re-run this list (and step 3's)
   when Cloudflare publishes new ranges - check `https://www.cloudflare.com/ips/` monthly.
5. **Cache.** Rules -> Cache Rules: hostname `web.mureforge.com` and URI path starting with
   `/Data`, `/game-assets`, `/packs` or `/items` -> eligible for cache, edge TTL "use cache-control
   header" (the container sends `max-age=86400`; `index.html`, `sw.js`, `build.json` and
   `serverlist.md` are `no-cache` and stay uncached). Nothing for `ws.`.
6. **Verify:** W9 and W10 again (through Cloudflare now); a session left idle on the character
   screen for five minutes must survive (the proxy's websocket pings keep Cloudflare's idle
   timeout from closing it); W11 shows your own address.

**Never delete the `web` or `ws` record during an attack.** The zone has a wildcard
`*.mureforge.com` pointing at the **website** box: a deleted `ws` record does not make the name
disappear, it moves the flood onto the website. To take a name off the internet, point its A
record at a sink - `192.0.2.1` (TEST-NET, routed nowhere) - and leave it in place; to bring it
back, point it at `WEB_VPS_IP` again (proxied).

---

## Updating

- **Client only** (new web image): set the new `WEB_IMAGE` sha in `.env`, then
  `docker compose pull web && docker compose up -d web`. Nobody is disconnected; open tabs see the
  new `build.json` and offer a reload. Every new build makes each player's asset worker drop its
  cached game data (music kept) and re-download it - batch client deploys, do not ship one per
  commit.
- **Game server release that changes packets or the XML of client 20404**: the web client parses
  packets generated from the server's XML (`versions/reforge/packets`), so after that server
  release (DEPLOY-FLOW, "web client" step) regenerate, commit, let CI build, and deploy the new
  `WEB_IMAGE` as above. Server first, as for every client.
- **Proxy** (new image or `proxy.env` change): **every web player is disconnected** - each is
  saved by the game server's normal logout path, but announce it like a game restart. Then
  `docker compose pull proxy && docker compose up -d proxy`.
- **World list**: edit `/opt/mureforge-webclient/serverlist.md`; it is live at once (no-cache),
  clients pick it up on their next launch.
- **A new game port / realm**: `ALLOW_TARGETS` first, then the realm's panel settings (S3, S5, and
  TrustedProxies once S11 is done), then the world list.
- **nginx vhost change**: copy the file to `sites-available`, `nginx -t && systemctl reload nginx`.
  A reload keeps open websockets.
- **OS**: unattended-upgrades applies security updates; a pending reboot is done by hand,
  announced (it drops every web player). Containers come back by themselves
  (`restart: unless-stopped`).

## Rollback

| What | How | Effect |
|---|---|---|
| bad client build | previous `WEB_IMAGE` sha in `.env`, `docker compose up -d web` | none for players in game |
| bad proxy build | previous `PROXY_IMAGE` sha, `docker compose up -d proxy` | web players reconnect |
| PROXY protocol problems | `PROXY_PROTOCOL=off`, `docker compose up -d proxy`, then TrustedProxies empty (S11) | web players reconnect |
| bad vhost | previous file into `sites-available`, `nginx -t && systemctl reload nginx` | none |
| undo the server side | panels: remove `WEB_VPS_IP` from Require Launcher, Maximum Connections Per IP, the 44406 exempt list, Abuse Protection's Login Ip Exempt Addresses, TrustedProxies; `rm /etc/fail2ban/jail.d/zz-webclient-ignore.local && fail2ban-client reload authelia`; `systemctl disable --now mureforge-webclient-allow.service` if S6 was done | on both realms |

`docker compose stop`/`down` in `/opt/mureforge-webclient` only ever touches the
`mureforge-webclient` project. Never run either in `/root/mu-reforge-server/deploy/prod`. Take
the web client offline (Kill switch, level 1-2) **before** undoing the server side, or the web
players still connected start logging launcher warnings (or get refused if Refuse Login is
armed).

## Kill switch

From mildest to hardest. None touches the game server process.

1. **Stop the relay** (web VPS): `cd /opt/mureforge-webclient && docker compose stop proxy`. The
   page still loads, nobody can connect; web players in game are disconnected cleanly (TCP close,
   saved by the logout path). Undo: `docker compose start proxy`.
   (Never by deleting the `web`/`ws` DNS records: the wildcard then sends that traffic to the
   website box. Point them at the sink `192.0.2.1` instead - "Cloudflare", last paragraph.)
2. **Take the site down** (web VPS):
   `rm /etc/nginx/sites-enabled/web.mureforge.com.conf /etc/nginx/sites-enabled/ws.mureforge.com.conf && nginx -t && systemctl reload nginx`,
   then level 1. Undo: re-create the two links (W8) and `docker compose start proxy`.
3. **Emergency, from the game side** - the web VPS is compromised or unreachable for you, and
   traffic from it must stop now. On **each** game box (Molten, then Inferno):

   ```bash
   export WEB_VPS_IP=<the address>
   iptables -I DOCKER-USER 1 -s "$WEB_VPS_IP" -j DROP
   iptables -S DOCKER-USER | head -3
   ```

   Position 1 beats every allow rule (S6) and fail2ban. Not persistent: a reboot clears it, so if
   the box is lost for good, also remove `WEB_VPS_IP` from the panels (Rollback). WireGuard and the
   other players are not affected. The cost: web players' sessions are not closed by a TCP close but
   time out on the server, so they stay "online" for a few minutes; progress up to the last
   60-second periodic save is safe. Use level 1 whenever the web VPS is still reachable.
   Undo: `iptables -D DOCKER-USER -s "$WEB_VPS_IP" -j DROP`.

## After the beta

- **Enforce the CSP.** When a week of beta play shows no CSP report in players' consoles (W10;
  ask testers), rename the header in `web.mureforge.com.conf` from
  `Content-Security-Policy-Report-Only` to `Content-Security-Policy`, reload, and repeat W10.
  Report-Only protects nothing: the phishing link `https://web.mureforge.com/?ws=wss://evil...`
  (a world profile taken from the URL) is only closed by the enforced `connect-src` - and by the
  pinned-world build (client side, wave 4) once it is live.
- Decide on R1's long-term fix (a separate client definition and ports for the web client).

## Risks

- **R1 - the proxy is a launcher-free door, by design.** The exemption matches the TCP source
  address exactly, and a TCP source cannot be forged past the handshake, so desktop players from
  any other address are still checked. What it opens: anyone who speaks the protocol over
  `wss://ws.mureforge.com` (a bot, a modified client behind a TCP-to-WSS shim) plays without
  launcher, without HWID, without Runtime Guard and without the per-machine limit. Mitigations
  here: `ALLOW_TARGETS`, the Origin check (weak: a script forges it), per-address
  `limit_conn 30` / `limit_req 60r/m`, a 2000-socket ceiling, the proxy's own per-socket limits,
  and the server-side limits of wave 4. Watch `/cheat-violations` and the item audit for accounts
  that only ever log in through the web client. The real fix, later: a separate client definition
  (own version bytes, own connect and game ports) for the web client, so the exemption covers only
  ports desktop players never use.
- **R2 - every process on the web VPS is exempt too.** Anything on `WEB_VPS_IP` that opens a TCP
  connection to a game port passes the launcher check. On a dedicated box that is only our two
  containers - keep it that way: no other service, no other user, SSH keys only (Part P). A
  compromise of the box is a launcher bypass; Kill switch level 3 cuts it off.
- **R3 - no per-player limits at the game server until S11.** Maximum Connections Per IP and
  Maximum Sessions Per Machine cannot tell web players apart while all of them arrive as
  `WEB_VPS_IP`; the nginx per-address limits are the only replacement (a household behind one NAT
  counts as one address). PROXY v2 (S11) restores the per-address ones.
- **R4 - the connect server's exempt list** may only go live at the next normal release (S3.4);
  until then all web players share 30 simultaneous server-select sockets. Public link after it.
- **R5 - a proxy restart drops every web player** (see Updating). Their progress is saved by the
  logout path, like any disconnect; announce it anyway.
- **R6 - fail2ban** on a game box banning `WEB_VPS_IP` would cut every web player off every game
  port (allports in `DOCKER-USER`). S5/S9 exempt it.
- **R7 - C1 FA is the band's code and our Item Collections'.** With `BAND=off` client FA frames
  reach the game server, which the web client's Item Collections window (FA 01 / FA 02) needs.
  Never turn `BAND` on for a Reforge proxy.
- **R8 - bandwidth.** A first visit downloads hundreds of MB (the gzip sidecars cut it to about
  a third), and every new web build makes returning players download most of it again. Watch
  `vnstat` against the Contabo plan; a CDN in front of `web.` (only) would move it off the box.
- **R9 - Report-Only CSP protects nothing** until it is enforced ("After the beta").
- **R10 - certificate renewal** reloads nginx; open websockets survive a reload (old workers keep
  them), so renewals do not disconnect players.
- **R11 - fork features.** Some fork features are not (or only partly) in the web client yet - see
  `versions/reforge/readme.md` ("Not yet"). Keep the beta label on the site until they are.
- **R12 - stat display.** Extended packets are used (20404), so HP/stats above 65535 display
  correctly; any packet still parsed in its classic form (`versions/reforge/readme.md`, "Not yet")
  can show stale or wrong values.

## Decisions log

- 2026-10-21: hostnames `web.` + `ws.mureforge.com`; realms Molten **and** Inferno, both through
  Molten's connect server 44406 (Inferno is listed on Molten through `REMOTE_REALM_URLS`, so
  `ALLOW_TARGETS` carries the Open Source ports of both realms); no CDN at launch (if one is added
  later it fronts `web.` only; in front of `ws.` nginx would first have to read the real client
  address from the CDN header); register link `https://mureforge.com/register` (default of
  `VITE_REGISTER_URL` in `web.Dockerfile` and the workflow; `REFORGE_REGISTER_URL` overrides it).
- 2026-10-21: Require Launcher - the exemption is added on both realms whatever **Refuse Login** is
  today; with it off the exemption only silences warnings, and it has to be in place before the
  switch is ever armed.
- 2026-10-24: the web client moves to a **dedicated VPS** (`WEB_VPS_IP`), off the website box;
  host nginx + certbot there; IPv4 only; connect server exempt list instead of 500 for everyone;
  PROXY protocol v2 with `TrustedProxies`, server release first, proxy switch second.
- 2026-10-24 (DDoS review): proxy buffers cut to 784 KiB per socket worst case with a
  2000-socket total cap (`MAX_SOCKETS_TOTAL`) and `PROXY_MEM` 3g sized for it; a byte bucket
  (32 KiB/s, burst 256 KiB) next to the frame bucket (60/s, burst 200); `WS_MAX_PAYLOAD` 16 KiB
  (largest real frame: a letter, ~1.5 KB); nginx `ws.` 30 sockets / 60 opens a minute per address,
  2000 total, 10 s header/body timeouts, backlog 4096; `limit_rate 4m` on the game data; the
  proxy trusts `X-Real-IP` only from the pinned compose gateway 172.31.250.1; `ALLOW_TARGETS`
  ships as CHANGEME (the OS ports come from the database, plus 55980 on both realms). Public link
  gated on PROXY v2 + the exemptions removed; Cloudflare recommended before it; per-source caps on
  the game ports optional (S6b).
