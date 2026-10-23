# fort_siege

Mu Reforge only: our server's Fort Siege (S GameLogic/FortSiege), as our client shows it: the
Fortress Herald's registration window (`CFortSiegeWindow`, NPC 767) and the crystal capture line
(`CFortSiegeHud`). The Lorencia fortress models are not part of it.

## Public API
- `FortSiege` (`state.ts`): the registration state, the capture line, the battle's sides, area and
  fighters, the owner buff, and the Herald's actions (`register`, `handInSigns`, `withdraw`).
- `codec.ts`: the readers of EF 01-06, the Herald request bytes and the rules of ReforgeFortHerald.cpp.

## How it works
- A click on the Herald opens the window (waiting for the state) and sends the talk; the server answers
  with EF 04. The buttons send C1 EF 01 [fort] / 02 / 03 (S FortHeraldRequestHandlerPlugIn reads the
  sub-code at 3 and the fort at 4); the server answers in the chat and with a new state.
- The capture line shows on the map it came on until its time and 5 s grace ran out.
- EF 02 (the capturer's own state) is read by no one, as in our client.

## Known gaps
- The team marks on the fighters (our client's `MarkOf`) and the free fight inside the battle area are
  not drawn; the sides and fighters are kept for them. The owner buff tooltip of the warp list is not shown.

## Packets
- `FortSiegeSides`, `FortCaptureState`, `FortWarps`, `FortRegistrationState`, `FortCaptureLine`,
  `FortFighters`: hand-written classes in `versions/reforge/packets/fortSiege.ts`.

## Depends on / used by
- uses: `npc_shop` (`registerNpcClick`), `session`.
- used by: `versions/shared/ui/windows/reforge_events`.

## Tests
- `codec.test.ts`: every reader against bytes laid out as FortSiegeViewPlugIn writes them, the request bytes, the rules.
