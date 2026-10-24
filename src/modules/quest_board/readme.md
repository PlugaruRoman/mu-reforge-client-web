# quest_board

Mu Reforge only. Captain Slough's quest board (NPC 763): the kill quests of each map's chain, taken
one after the other (S `GameLogic/PlayerActions/Quests/QuestBoardAction.cs`). Port of our C++
client's `GameLogic/Reforge/ReforgeQuestBoard.cpp`, `Network/Reforge/QuestBoardPackets.cpp` and
`UI/QuestBoard/QuestBoardWindow.cpp`.

## Public API
- `QuestBoard`: the last board (`board`, DF 01) and the active quests of every chain (`active`, DF 05).
- `QUEST_STATE`, `currentQuest`, `canAccept`, `canClaim`, `goalReached`, `progress`: the rules.
- `acceptQuest()`, `claimQuest()`, `closeQuestBoard()`, `QUEST_BOARD_WINDOW`, `QUEST_MASTER_NPC`.

## How it works
- A click on Captain Slough (`registerNpcClick`) asks for the board (DF 01) instead of talking; the
  server's talk plug-in would answer with the same board.
- Every DF 01 stores the board and opens the window (`BoardReceived`); on opening it asks for the
  active quests (DF 04, answered with DF 05). Walking off closes it.
- The board shows the active quest, else the next available one. Accept only when available, Claim
  only when active and the kills are reached; the server answers both with a new board.

## Packets
- in: `QuestBoardList` (C2 DF 01) and `QuestBoardActiveList` (C2 DF 05), `versions/reforge/packets/questBoard.ts`:
  S `RemoteView/Quest/QuestBoardViewPlugIn.cs`, 6-byte header + 100 bytes a quest (number, state,
  monster u16, required u16, current u16 LE, name[28], reward[64] UTF-8 zero padded).
- out, hand-built: DF 01 board, DF 02 accept (number), DF 03 claim, DF 04 active quests
  (S `MessageHandler/QuestBoard/*`).

## Not yet
- The T window rows of the active quests (`ActiveBoardQuests.cpp`): the board window lists them instead.

## Depends on / used by
- uses: `session`, `npc_shop` (`registerNpcClick`).
- used by: `versions/shared/ui/windows/quest_board`.

## Tests
- `net.test.ts`: the server's byte layout, a cut UTF-8 name, the rules, the requests' bytes, the NPC click
  and the window opening on DF 01.
