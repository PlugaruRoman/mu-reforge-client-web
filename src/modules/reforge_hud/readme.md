# reforge_hud

Mu Reforge only: the small HUD frames of our server and the places our client shows them.

## Public API
- `ReforgeHud` (`state.ts`): party members' buffs, PvP flags, monster spots, Guest Access (guest login,
  sessions, generate / revoke), whether requests are allowed (`requestsAllowed`, `toggleRequests`).

## How it works
- D8 04: the buffs of each member in party list order, drawn beside the party list.
- EA: a flagged player's name is violet and blinks over its last 5 s (`setNameTint` on the name tags,
  UI/Reforge/ReforgeNameplates.cpp); counted down here, the server sends nothing at the end.
- D5: the map's monster spots, markers on the minimap (`hud/minimap/shared.tsx`).
- D0 01/02/04: Guest Access (key L, our client's; it only toggles while no built-in action holds L,
  and Babylon's repair does by default); a guest login gets no window.
- E4 01: whether trade, party, duel and friend requests reach the hero; the Mu Reforge menu's switch
  flips it at once and sends `/requests on|off` (GameLogic/Reforge/ReforgeRequests.cpp), the server's
  E4 01 confirms. The module also carries the Mu Reforge menu window (`windows/reforge_menu`).
- EC: the server's rate and price for the tray, kept in `Economy.serverMixRate` and preferred by
  `Economy.mixCheck` while the recipe matches (MixMgr.h:321).
- F5 01: the server's chat commands join the `/` completion (`chat/chatCommands.ts`), asked for once a
  login with F5 00.

## Packets
- `PartyMemberBuffs` (hand-written, `versions/reforge/packets/partyMemberBuffs.ts`), `RequestsState`
  (hand-written, `versions/reforge/packets/requestsState.ts`), `PvpFlagState`,
  `MapMobSpotList`, `GuestAccessStatus`, `GuestAccessGenerateResponse`, `GuestAccessSessionList`,
  `ChaosMachineMixRate`, `AvailableChatCommand`, `CharacterInformationExtended`, `wsClosed`.

## Depends on / used by
- uses: `economy`, `chat/chatCommands.ts`, `session`, `controllers/interface/nameTags.ts`.
- used by: `versions/shared/ui/windows/reforge_hud`, `versions/shared/ui/windows/reforge_menu`, `versions/shared/ui/hud/minimap`.

## Tests
- `reforgeHud.test.ts`: party buffs, the PvP tint, the chat commands, the mix rate, Guest Access bytes,
  the requests switch.
