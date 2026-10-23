# invasions

Mu Reforge only. The boss status of our server's invasions (C2 CC 01), for the Invasions tab of
the Event Timer window (`versions/shared/ui/windows/event_timer`). Port of our C++ client's
`GameLogic/Reforge/ReforgeInvasionStatus.cpp` and `Network/Reforge/InvasionStatusPackets.cpp`.

## Public API
- `Invasions`: the last report, by status id (`statuses`), and a `version` bumped on each one.
- `applyInvasionStatus(id, nowMs, run)`: a timetable row's server part: beaten, alive / total, or the
  other server of the realm it runs on. `findRunning`, `isTownInvasion`, `secondsSinceDefeat`.
- `requestInvasionStatus()`: C1 CC 01, sent by the window every five seconds while it is open.

## How it works
- The server answers the request and also pushes the list to every player when a run is beaten
  (S `BaseInvasionPlugIn.OnRunDefeated`). The list is complete: each report replaces the last.
- Durations (`secondsToEnd`, `secondsSinceDefeat`) count on from the report's arrival on the shared
  clock (`controllers/net/serverTime.ts`).
- Status ids 1..19 are raid bosses (beaten = slain), 20 and up town invasions (beaten = cleared).
  The timetable that names them is `modules/event_list/timetable.ts`.
- The invasion notices themselves are the server's chat lines (`chat`); the dragon sky is
  `events/invasion.ts` (`MapEventState`).

## Packets
- `InvasionStatus` (C2 CC 01, `versions/reforge/packets/eventPackets.ts`): S
  `RemoteView/Invasions/InvasionStatusViewPlugIn.cs`.

## Depends on / used by
- uses: `session` (sending), `controllers/net/serverTime`.
- used by: `event_list/timetable.ts`, the Event Timer window.

## Tests
- `net.test.ts`: the 31-byte entries, the killer name, the request bytes, `applyInvasionStatus`.
