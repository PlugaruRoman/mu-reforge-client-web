# deep_dungeon

Mu Reforge only. Our server's Deep Dungeon event: five floors on server maps 90-94
(`WD_90DEEP_DUNGEON1..WD_94DEEP_DUNGEON5`), open twice a day. Port of our C++ client's
`GameLogic/Reforge/ReforgeDeepDungeon.cpp`, `Network/Reforge/DeepDungeonPackets.cpp` and
`UI/DeepDungeon/` (the floor selection window and the countdown HUD).

## Public API
- `DeepDungeon`: the last floor selection (`selection`, at `selectionAtMs`) and countdown
  (`countdown`, at `countdownAtMs`), both on the shared clock.
- `FLOORS`, `suggestedFloor`, `secondsLeft`, `windowUrgency`, `hudUrgency`: the rules the window and
  the HUD draw by.
- `enterDeepDungeon(floor)` (C1 E3 02, 1-based), `closeDeepDungeon()`, `DEEP_DUNGEON_WINDOW`.

## How it works
- Talking to the Dungeon Guide (NPC 766, Lorencia) is an ordinary talk; while the event runs the
  server answers with E3 01 and the window opens. Otherwise it answers with chat lines.
- Inside, E3 03 comes every few seconds; the HUD counts down between them and hides at 0.
- `FLOORS` is a copy of the server's ladder (monster levels, reset brackets), shown only.
- The window closes on a walk: the server refuses an entry away from the Guide.

## Packets
- `DeepDungeonFloorSelection` (C1 E3 01, 8 or 10 bytes) and `DeepDungeonCountdown` (C1 E3 03),
  `versions/reforge/packets/eventPackets.ts`: S `RemoteView/DeepDungeon/DeepDungeonViewPlugIn.cs`.
- out: E3 02 (S `MessageHandler/DeepDungeon/DeepDungeonEnterHandlerPlugIn.cs`), hand-built.

## Not yet
- The floor that fits the character's resets: Babylon has no reset count yet, so no floor is
  picked out as "suggested" (our client opens on it).

## Depends on / used by
- uses: `session`, `controllers/interface` (`MuWindows`), `controllers/net/serverTime`.
- used by: `versions/shared/ui/windows/deep_dungeon`.

## Tests
- `net.test.ts`: both forms of E3 01, E3 03, the E3 02 bytes, the ladder rules.
