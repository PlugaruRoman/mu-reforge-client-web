# Starts the Babylon client (vite) and the ws<->tcp proxy in two windows.
# Start mu-reforge-server first:
#   dotnet run --project src/Startup/MUnique.OpenMU.Startup.csproj -- -demo -autostart -resolveIP:loopback
$bun = Join-Path $env:USERPROFILE '.bun\bin\bun.exe'
$root = $PSScriptRoot
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root'; & '$bun' run proxy"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root'; & '$bun' run dev"
Start-Sleep -Seconds 6
Start-Process 'http://localhost:5173/online'
