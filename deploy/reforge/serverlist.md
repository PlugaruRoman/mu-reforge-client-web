# Mu Reforge

The worlds the Mu Reforge web client offers. Served at https://web.mureforge.com/serverlist.md
(compose.yml mounts this file into the web container) and read through VITE_SERVER_LIST_URL.
Format: src/modules/servers/readme.md ("serverList.ts"). Prose lines like these are ignored.

The world is published as a proxy alias, `cs@wss://ws.mureforge.com`: `cs` is a name the proxy
resolves (PROXY_TARGETS in proxy.env, proxy/targetAliases.ts), so this public file carries no
address and no port of ours. Never the bare domain form either: that would send the client's
register, shop and market calls to `register.` / `api.mureforge.com`, and `api.mureforge.com` is
our website's backend.

`cs` is Molten's connect server for the Open Source client (version 20404, tag REFORGE). It also
lists Inferno's game servers (REMOTE_REALM_URLS on Molten), so one world line covers both realms.
Every game server it hands out must have a name in PROXY_TARGETS: the proxy rewrites the address
the connect server sends into that name before the browser sees it.

The alias form needs a web client that reads it (the `alias@proxy` target, serverList.ts) and a
proxy with PROXY_TARGETS; a client or proxy without it does not show / refuses this world. Roll
back with `play.mureforge.com:44406@wss://ws.mureforge.com` plus ALLOW_TARGETS (runbook.md).

Names: the connect server sends ids only. The client files every id below 256 under game
server 0 (`ServerId >> 8`) and shows the low byte as the channel, so Molten 0-2 and Inferno
20-22 are six channels of one entry.

[1:REFORGE:Mu Reforge:Molten x100 PvP and Inferno x1200:en](cs@wss://ws.mureforge.com)
- 0: Mu Reforge
  - 0: Molten-1
  - 1: Molten-2
  - 2: Molten-3
  - 20: Inferno-1
  - 21: Inferno-2
  - 22: Inferno-3
