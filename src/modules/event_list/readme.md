# event_list

Mu Reforge only. Our server's mini-game event list (C1 97) and the timetable of the Event Timer
window. Port of our C++ client's `GameLogic/Reforge/ReforgeEventList.cpp`,
`Network/Reforge/EventListPackets.cpp`, `GameLogic/Reforge/ReforgeEventSchedule.cpp` and
`UI/EventTimer/EventTimerEntries.cpp`.

## Public API
- `EventList`: the last report in display order (`entries`) and when it arrived (`receivedAtMs`).
  Row rules: `secondsUntilStart`, `entriesLeft`, `isSpent`, `isFull`, `occupancy`.
- `requestEventList()`: C1 9F `MiniGameEventCountRequest`, sent by the Event List window every five
  seconds while it is open.
- `TIMER_ENTRIES`, `timerRows(tab, nowMs)`, `stateAt`, `utcMomentOf`, `countdownText`,
  `TVT_TIMETABLE`: the Event Timer's rows and their maths.

## How it works
- The server pushes the list on entering the world and after each entry attempt, and answers C1 9F.
  Each list is complete and replaces the last; it is ordered open, running, waiting by start, ended.
- The Blood Castle, Devil Square and Chaos Castle answers also feed the HUD's schedule rows
  (`events/schedule.ts` `takeServerSchedule`), which then poll less.
- `timetable.ts` is a copy of the table our C++ client hard-codes (UTC; the server's
  `PeriodicTasks/*StartConfiguration.cs`, `InvasionConfigurationDefaults.cs`, Olympiad, Fort Siege and
  Castle Siege). The server sends no schedule for most rows; where it does (the four mini-games), its
  answer wins, and an invasion's boss status (`modules/invasions`) is laid over its row. Re-check
  the table against our client's whenever the server's schedule changes.

## Packets
- `EventList` (C1 97, generated from our XML): S `RemoteView/MiniGames/EventListViewPlugIn.cs`.
- out: `MiniGameEventCountRequest` (C1 9F, generated).

## Depends on / used by
- uses: `session`, `events` (`takeServerSchedule`), `invasions`, `controllers/net/serverTime`.
- used by: the Event Timer and Event List windows (`versions/shared/ui/windows/event_timer`,
  `event_list`), `tvt`'s window (`TVT_TIMETABLE`).

## Tests
- `net.test.ts`: the 10-byte entries, the order, the request bytes, the HUD feed.
- `timetable.test.ts`: daily, interval and weekly timetables, a run across midnight, the 97 and CC overlays.
