# olympiad

Mu Reforge only (`versions/shared/reforgeOnlyModules.ts`): our server's weekly Olympiad and the
Death Records, as our C++ client shows them (UI/Olympiad/OlympiadWindow.cpp,
UI/DeathRecords/DeathRecordsWindow.cpp).

## Public API
- `Olympiad` (`state.ts`): the last board, the Death Records and the actions (`openAt`, `requestBoard`,
  `join`, `leave`, `certify`, `reward`, `claimTokens`, `buy`, `watch`, `requestDeathRecords`).
- `board.ts`: `readOlympiadBoard`, `readDeathRecords` and the page / rate rules of ReforgeOlympiad.cpp.
- `OLYMPIAD_WINDOW`, `DEATH_RECORDS_WINDOW`: the window ids (`versions/shared/ui/windows/olympiad`).

## How it works
- A click on the Battle Statue (NPC 650) opens the window without a talk (`npc_shop/npcClicks.ts`) and
  asks for the board; Join Match is the talk to the statue (the server registers on it).
- Every other action is a chat line our server reads (`/olympiad board|leave|certify|reward i|tokens|buy ...|watch r`,
  S OlympiadChatCommandPlugIn), sent unseen by `chat/sendLine.ts`.
- A switched-off Olympiad answers only in the chat: the window says "not available" after `NO_ANSWER_MS`.
- The Death Records are asked for with C1 04 E0 01 when their window opens (key Y, our client's; it
  only toggles while no built-in action holds Y, and Babylon's reply-whisper does by default).

## Packets
- `OlympiadBoard` (C2 EE 01), `DeathRecords` (C2 E0 01): hand-written classes in
  `versions/reforge/packets/olympiad.ts`.

## Depends on / used by
- uses: `npc_shop` (`registerNpcClick`), `session`, `chat/sendLine.ts`, `controllers/interface`.
- used by: `versions/shared/ui/windows/olympiad`.

## Tests
- `board.test.ts`: the board and the records from bytes laid out as the C# writers do, cut lists, page rules.
