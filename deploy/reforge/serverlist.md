# Mu Reforge

The worlds the Mu Reforge web client offers. Served at https://web.mureforge.com/serverlist.md
(compose.yml mounts this file into the web container) and read through VITE_SERVER_LIST_URL.
Format: src/modules/servers/readme.md ("serverList.ts"). Prose lines like these are ignored.

The world is published in the long form `host:port@proxy`, never as the bare domain: the domain
form would send the client's register, shop and market calls to `register.` / `api.mureforge.com`,
and `api.mureforge.com` is our website's backend.

`play.mureforge.com:44406` is Molten's connect server for the Open Source client (version 20404,
tag REFORGE). It also lists Inferno's game servers (REMOTE_REALM_URLS on Molten), so one world
line covers both realms. Every host:port the proxy dials must be in ALLOW_TARGETS (proxy.env).

Names: the connect server sends ids only. The client files every id below 256 under game
server 0 (`ServerId >> 8`) and shows the low byte as the channel, so Molten 0-2 and Inferno
20-22 are six channels of one entry.

[1:REFORGE:Mu Reforge:Molten x100 PvP and Inferno x1200:en](play.mureforge.com:44406@wss://ws.mureforge.com)
- 0: Mu Reforge
  - 0: Molten-1
  - 1: Molten-2
  - 2: Molten-3
  - 20: Inferno-1
  - 21: Inferno-2
  - 22: Inferno-3
