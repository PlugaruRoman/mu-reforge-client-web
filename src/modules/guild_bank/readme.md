# guild_bank

Mu Reforge only (`versions/shared/reforgeOnlyModules.ts`): the shared guild bank, the guild settings
(per-rank bank rights) and the guild window's castle warp, all on our server's C1/C2 DC frames.
Ported from our client's `UI/GuildBank/GuildBankWindow.cpp`, `UI/GuildSettings/GuildSettingsWindow.cpp`
and `UI/Reforge/ReforgeGuildButtons.cpp`; the packets are in `Network/Reforge/GuildBankPackets.cpp`
and `GuildPackets.cpp`.

## Public API
- `GuildBank` (`state.ts`): the open page (`items`, `money`, `canWithdraw`, `lock`, `page`,
  `pageCount`, `selected`), the prompt up, the settings grid and `ownsCastle`; its actions send
  the requests (`deposit`, `withdraw`, `moveSelected`, `moveMoney`, `changePage`, `unlock`,
  `setPin`, `removePin`, `close`, `openSettings`, `saveSettings`, `askCastle`, `warpToCastle`).
- `BANK_COLUMNS` / `BANK_ROWS`, `BankLock`, `GuildRank`, `ASSIGNABLE_RANKS`, `PIN_DIGITS`,
  `isAcceptablePin`.

## How it works
- A session opens only at the Guild Master NPC: a guild member's talk is answered with DC 08
  (page info), DC 0C (lock) and DC 01 (list) instead of a window (S GameLogic/PlayerActions/
  TalkNpcAction.cs:160-167, GuildBankAction.OpenAsync). DC 08 opens the window and the inventory.
- DC 01 is the whole active page every time: zen, the withdraw right, then slot + item in the
  extended codec (`readBankList`, S RemoteView/GuildBank/GuildBankViewPlugIn.cs). Three pages of
  8 x 15; the zen is shared.
- Deposit (DC 03): a bag item dropped on the bank, or right-clicked in the inventory while the bank
  is open. The bag keeps the item until the server's `ItemRemoved`; worn items are refused here.
- Withdraw (DC 04): right click on a bank item; the server picks the inventory square.
- Rearrange (DC 10): click a bank item, then a free square. Both need the withdraw right.
- Zen (DC 05), page (DC 07), PIN unlock / set / remove (DC 0A / 09 / 0B, four digits, not all the
  same), close (DC 06; also on a walk, with the inventory).
- Settings: the guild window's Settings button (guild master) opens the grid; DC 0D asks, DC 0E saves.
- Castle: each time the guild window opens it sends DC 0F action 0; `GuildCastleWarpState` shows the
  Castle button, which sends action 1.

## Depends on / used by
- uses: `social` (guild window state, `isGuildMaster`), `session`, `chat`, `controllers/item_rules`
  (`readItemList`), `versions/reforge/packets` (the DC classes).
- used by: `versions/shared/ui/windows/guild_bank/` (bank, prompts, settings, the guild window's
  buttons), `windows/inventory` (right-click deposit), `windows/guild` (the buttons).

## Not yet
- Dragging a bank item out onto the inventory (our client's `SendMoveOut`): use the right click.
- The bank's own zen limits (`MaxVaultDeposit`): the box caps at the bag's zen and the bank's.

## Tests
- `net.test.ts`: DC 01 / 08 / 0C / 0D / 0F parsed from byte fixtures, every request's bytes.
