# soul_points

Mu Reforge's Soul Point system (C1 DE): free points spent on 16 permanent bonuses in four
categories, each with three milestones, and a paid reset. A port of our client's
`UI/SoulPoints/SoulPointWindow.cpp`, `Network/Reforge/SoulPointPackets.cpp` and
`GameLogic/Reforge/ReforgeSoulPoints.cpp`. Reforge only (`versions/shared/reforgeOnlyModules.ts`).

## Public API
- `SoulPoints` (`state.ts`): the server's report (free points, allocated, caps, reset balances and
  costs), the plan the player builds (`planned`, `left`, `pendingTotal`, `stepPlan`) and the last
  reset answer; actions `requestInfo`, `invest`, `reset`.
- `SOUL_DEFINITIONS` (the server's SoulPointDefinitions table, as our client keeps it),
  `reachedMilestone`, `primaryValue`, `SoulPayment`, `SoulResetResult`, `SOUL_WINDOW`.

## How it works
- Invested points are locked: the plan never goes below them; freeing them is the paid reset.
- Invest sends the whole planned allocation; the server answers with a fresh DE 01.

## Packets
- DE 01 `SoulPointInfo` (variable) and DE 03 `SoulPointResetResult`, hand-written on the server
  (S GameServer/RemoteView/SoulPoints/SoulPointViewPlugIn.cs); classes in
  `versions/reforge/packets/accountSystems.ts`.
- Sent (S MessageHandler/SoulPoints/): DE 01; DE 02 `[16]` then `[type][points u16 LE]` per
  attribute; DE 03 `[payment]`.

## Depends on / used by
- uses: `session`. Used by: `versions/shared/ui/windows/soul_points` (key S, the character window's tab).
