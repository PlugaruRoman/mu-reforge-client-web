# Plays OUR production servers from this machine: the web client (vite, http://localhost:5180) and the
# ws<->tcp proxy (127.0.0.1:3000), each in a window of its own. No local game server, no .env file:
# everything the client needs is set here, the same switches the production image is built with
# (deploy/reforge/web.Dockerfile) - one pinned world, no worlds list, no setup, no offline scene.
#
# The live site does not need this: web.mureforge.com talks to wss://ws.mureforge.com. This is for
# trying a change against the real servers before it ships.
$bun = Join-Path $env:USERPROFILE '.bun\bin\bun.exe'
$root = $PSScriptRoot

$client = @(
    '$env:VITE_PINNED_WORLD = ''on'''
    '$env:VITE_PINNED_VERSION = ''REFORGE'''
    '$env:VITE_APP_NAME = ''Mu Reforge'''
    '$env:VITE_SERVER_LIST_URL = ''/reforge-prod-serverlist.md'''
    '$env:VITE_WS_HOST = ''ws://localhost'''
    '$env:VITE_WS_PORT = ''3000'''
    '$env:VITE_CS_HOST = ''play.mureforge.com'''
    '$env:VITE_CS_PORT = ''44406'''
    '$env:VITE_CS_VERSION = ''REFORGE'''
    '$env:APP_ENV = ''dev'''
    # Port 5180, strict: another vite on 5173 shares node_modules/.vite, and a second optimizer run pulls
    # the dependency chunks from under the first one's open tabs.
    "Set-Location '$root'; & '$bun' x vite --port 5180 --strictPort"
) -join '; '

# Loopback only: without PROXY_TARGETS / ALLOW_TARGETS this proxy relays to any host, which is fine for
# one browser on this machine and nothing else. The dev-only features stay off, as in production.
$proxy = @(
    '$env:HOSTNAME = ''127.0.0.1'''
    '$env:LOG_PACKETS = ''off'''
    '$env:TRACK = ''off'''
    '$env:BAND = ''off'''
    '$env:PING = ''off'''
    '$env:PRESENCE = ''off'''
    "Set-Location '$root'; & '$bun' proxy/main.ts"
) -join '; '

Start-Process powershell -ArgumentList '-NoExit', '-Command', $proxy
Start-Process powershell -ArgumentList '-NoExit', '-Command', $client
Start-Sleep -Seconds 8
Start-Process 'http://localhost:5180/'
