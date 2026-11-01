# guild_browser

Mu Reforge's two guild browsers, opened by the guild master from the plates on the guild window: Guild
Wars (every guild online on this game server, a war declared on it in one click) and Guild Alliance
(the same guilds, each asked into the own alliance). A port of our client's
`UI/GuildWar/GuildBrowserWindow.cpp`, `GameLogic/Reforge/ReforgeGuildBrowser.cpp` and
`Network/Reforge/GuildPackets.cpp`. Reforge only (`versions/shared/reforgeOnlyModules.ts`); it requires
`guild_war`, whose stock packets carry the answers.

## Public API
- `GuildBrowser` (`state.ts`): the last war list and alliance list. The rules `canDeclare(On)`,
  `canInvite(To)`, `canStop`, `matchesFilter`, `matchesNoGuild`; `WarState`, `AllianceState`.
- Actions (`net.ts`): `requestList`, `actOnGuild`, `actOnTyped`, `answerRequest`, `stopWar`;
  `GUILD_WARS_WINDOW` / `GUILD_ALLIANCE_WINDOW` (`guild_wars`, `guild_alliance`).

## How it works
- Opening a window asks for its list, then every 15 s while it stays open, and 1.5 s after an own
  action or a stock war / alliance packet (the server answers the action first).
- A war is declared with the chat command `/war <guild>` and ended (withdraw, cancel, surrender) with
  `/warstop`: the protocol has no packet for them. They go out as UTF-8 (`buildChatCommand`), since a
  guild name may be Cyrillic.
- A declaration marks the own side as waiting at once, so no second one goes out before the next list.
- The banner answers an incoming challenge with the stock 0x61 and an alliance request with the stock
  0xE6 (no player id), and drops the yes/no box that asks the same.
- DC 11 from the server (an alliance asked for by guild name) raises the classic yes/no box
  (`Social.guildRelationRequest`, sender id 0); a second one while a box is up is refused.
- The stock result packets (`guild_war`) show the errors: guild not found, master offline, refused...

## Packets
Hand-written on the server (no XML), classes in `versions/reforge/packets/guildBrowser.ts`:
- C2 DC 10 war list: `[state][warType][own][enemy][max][otherGuild:9][count]`, 56 bytes a guild from 20
  (S RemoteView/Guild/GuildWarListViewPlugIn.cs).
- C1 0D DC 11 alliance request by name: `[guildName:9]` (GuildAllianceRequestViewPlugIn.cs).
- C2 DC 12 alliance list: `[state][isAllianceMaster][size][otherGuild:9][count]`, 56 bytes a guild from 18
  (GuildAllianceListViewPlugIn.cs).
- A guild: `[name:9][online][flags][score u32 LE][other:9][mark:32]`; flags 1 master online, 2 busy,
  4 our ally (war list only).
- Requests: C1 04 DC 10 (war list; the bank's move request without its slots), C1 0C DC 11 name[8]
  (alliance request, S MessageHandler/GuildSettings/GuildAllianceRequestHandlerPlugIn.cs), C1 04 DC 12.

## Depends on / used by
- uses: `session`, `hero`, `social`. Used by: `versions/shared/ui/windows/guild_browser`.

## Tests
- `guildBrowser.test.ts`: both lists and DC 11 parsed from the server layout, the requests' bytes, the
  rules, the actions and the DC 11 box.
