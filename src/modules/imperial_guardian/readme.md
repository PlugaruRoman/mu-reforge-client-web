# imperial_guardian

Mu Reforge only: the Fortress of Imperial Guardian timer (C1 F7 02 / 04 / 06), as our client's
`CEmpireGuardianTimer` and the boxes of WSclient.cpp `ReceiveEnterEmpireGuardianEvent` /
`ReceiveResultEmpireGuardian`.

## Public API
- `ImperialGuardian` (`state.ts`): round, zone, phase, the clock, monsters left and the box up.

## How it works
- F7 02 success keeps round, zone and time; a refusal raises its box. F7 04 shows the timer and resyncs
  it; F7 06 hides it and shows the zone / round result or the failure.
- Leaving maps 69-72 or the game hides it.

## Known gaps
- The entry dialog of Adviser Jerinteu (`NpcWindow` ImperialGuardian) is not ported; the event is
  entered the way Babylon's NPC talk already does it.

## Packets
- `ImperialGuardianEnterResult`, `ImperialGuardianRemainingTime`, `ImperialGuardianClearResult`.

## Depends on / used by
- used by: `versions/shared/ui/windows/reforge_events`.

## Tests
- `imperialGuardian.test.ts`: entry refusals, the timer and the results from packet bytes.
