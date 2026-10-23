# xshop

Mu Reforge's X-shop (the in-game cash shop, C1 D2) and rental item expiry (D2 11 / D2 12). Reforge-only
(`versions/shared/reforgeOnlyModules.ts`): every other version leaves it off.

## Public API
- `XShop` (`state.ts`): open state, balances, the catalog, the selected zone / category / page, the buy panel,
  the shop storage; `toggle`, `close`, `selectZone`, `selectCategory`, `turnPage`, `startBuy`, `buy`,
  `requestStorage`, `useStorageItem`, `affordable`. `bagPrice` keeps D2 60.
- `periodItemLines(slot, item)`, `periodItemExpiry`, `formatExpiry` (`periodItems.ts`): the tooltip's expiry lines.
- `requestBagPrice()` (`bagPrice.ts`): C1 04 D2 60, the price of one more inventory bag.
- `itemOfCode`, `balanceOf` and the catalog types (`catalog.ts`).

## How it works
- X (HotKey.cpp:320) or the main frame's shop button (`m_BtnCShop`; `bottom_bar/mainFrameButtons.ts` picks the
  X-shop when this module is on, Babylon's marketplace otherwise) sends D2 02 `IsClosed = false`. The server
  answers D2 02 with 1; then the balance (D2 01) and storage page 1 (D2 05, box `'S'`) are asked for, as
  `ReceiveIGS_ShopOpenResult` (WSclient.cpp:12751) does. Closing sends D2 02 `IsClosed = true`.
- The catalog is client data, as in our C++ client: `Data/InGameShopScript/512.2012.<year>/IBS*.txt`, the files
  our server prices from (S GameLogic/PlayerActions/CashShop/CashShopCatalog.cs). `catalogGenerate.ts` writes
  `catalogData.ts` (years 76 and 77, ~90 KB, loaded as its own chunk on the first open). D2 0C's year id
  picks the year (S `CashShopCatalog.ScriptYearIdOf`).
- Zones are the root categories (W Coin (C), W Coin (P), Goblin Point); their child categories are tabs; a
  page shows 9 packages. A package with price tiers (`PriceSeqList`) offers them as choices
  (`MsgBoxIGSBuySelectItem`); Buy sends D2 03 with the package seq and the chosen price seq (0 for a flat
  package). Buy is off when the balance of the price's unit is short (`ReforgeShopRules.cpp IsAffordable`).
  Gift is always off: our server refuses D2 04.
- The storage lists D2 0D lines after a D2 06 count; an entry names its price seq, which the catalog turns into
  a name and an item. Use sends D2 0B (item seq in `MainItemCode`, what the server reads), then D2 01.
- Rentals: D2 11 clears the list, each D2 12 keeps `{item code, expiry}` by inventory slot. The tooltip
  (`versions/shared/ui/components/item_tooltip`) ends with "Expiration date:" (orange) and the local date
  (blue), or "Expired item" (red), when the item at the slot still has that code (ZzzInventory.cpp:5127-5144).

## Packets
All hand-written on the server, classes in `versions/reforge/packets/cashShop.ts`: D2 01 points, D2 02 open,
D2 03 buy result, D2 06 storage count, D2 0B use result, D2 0C script version, D2 0D storage item, D2 11 / 12
rentals, D2 15 banner (ignored), D2 60 bag price. Requests use the shared generated `CashShop*Request` classes.

## Depends on / used by
- uses: `session` (sending), `chat` (`addNotification`), `versions/shared/packets` (requests).
- used by: `versions/shared/ui/windows/xshop/`, `bottom_bar/mainFrameButtons.ts`, the item tooltip.

## Change it
- the shop scripts changed: `MU_DATA=<client-next>/src/bin/Data bun src/modules/xshop/catalogGenerate.ts`.

## Not yet
- No banner, no gift box tab (always empty on our server), no "Expanded Inventory" buy modal (D2 60 is stored
  only), no event package list (D2 13 / 14), no 3D item previews: the cards draw the item's icon.

## Tests
- `xshop.test.ts`: every frame parsed from bytes laid out as the C# writers do, the requests built, the catalog.
