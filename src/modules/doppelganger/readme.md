# doppelganger

Mu Reforge only: the Doppelganger match HUD our server drives (C1 BF 0E-14), as our client's
`CDoppelGangerFrame` (UI/Events/DoppelGangerFrame.cpp). Lugard's entry window stays the events
module's (`events/doppelganger.ts`); this module locks its Enter button from the entry answer.

## Public API
- `Doppelganger` (`state.ts`): the frame (monsters through, clock, monster gauge, Ice Walker, party
  markers), its box (the failure conditions at the start, then the result) and the 0x92 notice.

## How it works
- State Playing (BF 10) opens the frame and the rules box; BF 13 stops the clock and shows the result.
- The gauges move toward the received positions (`approach`, 0.01 of the path a frame in the original).
- `UpdateMiniGameState` 16-19 (our server's Doppelganger values) show a 30-second line; our C++
  client ignores them (`CDoppelGangerMatch::SetMatchGameCommand` is empty).
- Leaving the arenas (maps 65-68) or the game closes everything.

## Packets
- `DoppelgangerEnterResult`, `DoppelgangerMonsterPosition`, `DoppelgangerStateUpdate`,
  `DoppelgangerIceWalkerState`, `DoppelgangerPlayInfo`, `DoppelgangerResult`, `DoppelgangerMonsterGoal`,
  `UpdateMiniGameState`, `warpCompleted`, `wsClosed`.

## Depends on / used by
- uses: `events/doppelganger.ts` (`lockDoppelgangerEntry`), `chat` (`addNotification`).
- used by: `versions/shared/ui/windows/reforge_events`.

## Tests
- `doppelganger.test.ts`: the packets drive the frame, the lock and the result.
