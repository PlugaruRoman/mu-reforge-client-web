# hunt_log

Mu Reforge only. The "Instant Hunting Log": the current hunting session's figures as our server
computes them (S `GameLogic/Hunt/HuntLogInfoAction.cs`). Port of our C++ client's
`GameLogic/Reforge/ReforgeHuntLog.h`, `Network/Reforge/HuntLogPackets.cpp` and `UI/HuntLog/HuntLogHud`.

## Public API
- `HuntLog`: the last figures (`statistics`), `pinned` (opened by hand) and `dismissed` (closed for
  this MU Helper run). `huntLogShown(helperActive)`, `closeHuntLog`, `helperStopped`, `toggleHuntLog`
  (the Mu Reforge menu's row, `versions/shared/ui/windows/reforge_menu`).
- `requestHuntLog()`: C1 DA 01.

## How it works
- The log comes up by itself while the MU Helper runs, as the old client's did; its X closes it for
  that run, and the next helper start brings it back.
- While it shows it asks once a second; the server answers every request. Every rate, projection
  and the reset check is the server's.

## Packets
- `HuntLogInfo` (C1 DA 01, 80 bytes), `versions/reforge/packets/eventPackets.ts`: S
  `RemoteView/Hunt/HuntLogViewPlugIn.cs`.
- out: DA 01 (S `MessageHandler/Hunt/HuntLogRequestHandlerPlugIn.cs`), hand-built.

## Not yet
- Our client's sizes, folding to the title and the dragged place kept across sessions.

## Depends on / used by
- uses: `session`.
- used by: `versions/shared/ui/windows/hunt_log` (which reads `mu_helper`'s `MuHelper.active`).

## Tests
- `net.test.ts`: the 80-byte figures, the request bytes, when the log shows.
