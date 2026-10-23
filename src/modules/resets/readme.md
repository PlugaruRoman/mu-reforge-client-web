# resets

Mu Reforge's character resets, paid stat / master tree resets and Auto Add stat points (C1 D9),
plus the bulk stat add (F3 06 with an amount). A port of our client's `UI/Reset/ResetWindow.cpp`,
`UI/Reset/PaidResetDialog.cpp`, `UI/Character/AddStatsWindow.cpp`,
`Network/Reforge/ResetPackets.cpp` and `ResetRequests.cpp`. Reforge only
(`versions/shared/reforgeOnlyModules.ts`).

## Public API
- `Resets` (`state.ts`): the next reset and grand reset, the two paid price lists and the last paid
  result, the stored Auto Add settings and the points a level up gives; actions `requestInfo`,
  `doReset`, `requestPaid`, `payPaid`, `requestAuto`, `saveAuto`, `addPoints`.
- Rules: `canAfford`, `canPaidReset`, `clampAuto`, `percentTotal`, `pointsPerTrigger`,
  `nextTriggerLevel`, `planBulk`. Enums `ResetReason`, `PaidResetResult`, `Payment`.
- `RESET_WINDOW`, `ADD_STATS_WINDOW`.

## How it works
- The reset and the grand reset themselves are the chat commands `/reset` and `/grandreset`, as our
  client sends them (`sendChatLine`); D9 01 / 02 only describe what the next one needs.
- The bulk add sends one F3 06 per stat with a 16-bit amount, big endian at byte 5: our server adds
  that many at once (S MessageHandler/Character/CharacterStatIncreasePacketHandlerPlugIn.cs). The
  answer is the hero's `CharacterStatIncreaseResponseExtended` (modules/hero).
- Saving the Auto Add settings is answered with D9 07 again; the window compares against it.

## Packets
- Hand-written on the server (S GameServer/RemoteView/Reset/ResetInfoViewPlugIn.cs,
  RemoteView/Character/AutoStatConfigurationViewPlugIn.cs), classes in
  `versions/reforge/packets/accountSystems.ts`: D9 01 `ResetInfo`, 02 `GrandResetInfo`,
  03 / 05 `StatResetInfo` / `MasterResetInfo`, 04 / 06 `StatResetResult` / `MasterResetResult`,
  07 `AutoStatConfiguration`.
- Sent (S MessageHandler/Reset/): D9 01-03, 05, 07 bare; D9 04 / 06 `[payment]`; D9 08
  `[enabled][interval][5 shares]`.

## Depends on / used by
- uses: `session`, `chat` (`sendChatLine`). Used by: `versions/shared/ui/windows/reset` and
  `add_stats` (the tabs over the character window).
