# tvt

Mu Reforge only. Our server's Team vs Team (map 87, `WD_87TEAM_VS_TEAM`): the score board and the
Battle Master's window. Port of our C++ client's `GameLogic/Reforge/ReforgeTvtMatch`,
`Network/Reforge/TvtPackets.cpp` and `UI/Tvt/` (`TvtWindow`, `TvtScoreHud`, `TvtNpcTalk`).

## Public API
- `Tvt`: the running match (`match`: score, seconds left at receipt, own team, the roster by object
  key), `registrationOpen` (the server's word) and the Battle Master the window was opened for.
- `tvtSecondsLeft(nowMs)`, `tvtTeamOf(key, isHero)`.
- `joinTvt()`, `closeTvtWindow()`, `TVT_WINDOW`.

## How it works
- A click on the Battle Master (NPC 765, Lorencia) opens the window without a talk
  (`npc_shop` `registerNpcClick`, as our client's `ReforgeNpcTalk.cpp`). Join talks to him
  (`Merchant.talkToNpc`): the server's `TvtJoinNpcPlugin` registers the player or says why not. Join
  is greyed while the server's registration is closed. The window closes on a walk.
- The score HUD shows on map 87 while a match is active; the time counts down from the last E2 01.
- The timetable the window lists is `event_list`'s `TVT_TIMETABLE` (UTC, a copy of our client's).

## Packets
- `TvtScore` (C1 E2 01) and `TvtRegistration` (C1 E2 02), `versions/reforge/packets/eventPackets.ts`:
  S `RemoteView/Tvt/TvtScoreViewPlugIn.cs`.

## Not yet
- The team emblems over the fighters' heads (`TvtTitlesHud`, Rank08 / Rank09) and the target rule
  that an enemy fighter needs no attack modifier (`IsEnemy`). `tvtTeamOf` is the reader both need.

## Depends on / used by
- uses: `npc_shop` (`registerNpcClick`, `Merchant.talkToNpc`), `controllers/interface` (`MuWindows`).
- used by: `versions/shared/ui/windows/tvt`.

## Tests
- `net.test.ts`: E2 01 with its roster, E2 02, the Battle Master click, Join.
