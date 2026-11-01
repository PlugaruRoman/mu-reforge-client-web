# party_search

Mu Reforge's Party Search (head code D8): a party master lists his party with filters (maximum level,
password, guild / alliance only, one per class, allowed classes), other players browse the list and
join without asking; the master hands the lead over from the party window. A port of our client's
`UI/PartySearch/PartySearchWindow.cpp`, `PartyWindowExtras.cpp`, `Network/Reforge/PartySearchPackets.cpp`
and `GameLogic/Reforge/ReforgeParty.cpp`. Reforge only (`versions/shared/reforgeOnlyModules.ts`).

## Public API
- `PartySearch` (`state.ts`): the open list, the listing as the controls show it, the auto-accept
  preference, the join password and the last refused join; actions `open(tab)`, `toggle`,
  `selectTab`, `requestList`, `poll`, `join`, `toggleOption`, `toggleClass`, `stepLevel`, `save`,
  and the party window's `giveLead` (two clicks within 5 s). `PARTY_SEARCH_WINDOW`, `PartySearchTab`,
  `JoinResult`, `isPartyMaster` and the class-mask helpers.

## How it works
- Opening a tab asks for the list (D8 02); the server answers with the list and the player's own
  listing (D8 01). The Find tab asks again every 4 s.
- Edits on the settings tab stay until Save (D8 01); a status arriving meanwhile does not undo them.
  Auto accept is a personal preference and goes at once (D8 04).
- Guild only and alliance only exclude each other (the server checks both with the same comparison).
- A mask of 0 from the server means every class: every box shows ticked.

## Packets (S GameServer/RemoteView/Party/PartySearchViewPlugIn.cs, MessageHandler/Party/*)
- in: C1 D8 01 (20 bytes) `[result][active][maxLevel u16][classMask][flags][password:10]`;
  C2 D8 02 `[count]` x `[masterName:10][map][x][y][members][maxMembers][hasPassword]`;
  C1 D8 03 `[result]`. Classes: `versions/reforge/packets/partySearch.ts` (hand-written, not in the XML).
- out: D8 01 `[active][maxLevel u16][classMask][flags][password:10]`, D8 02, D8 03
  `[masterName:10][password:10]`, D8 04 `[on]`, D8 05 `[memberName:10]` (hand the lead).
- Strings are UTF-8, zero padded, cut at a character boundary.

## Depends on / used by
- uses: `session`, `social` (the party), `hero`. Used by: `versions/shared/ui/windows/party_search`
  and the party window (`windows/party`: Find / Settings buttons, lead flags, P without a party).
