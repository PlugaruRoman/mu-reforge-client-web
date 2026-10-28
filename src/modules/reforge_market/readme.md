# reforge_market

Mu Reforge's market board (C1/C2 E8): a search over every open personal store of the game server,
offline stores included, and a walk to the seller. Nothing is bought through it: the purchase
happens in the seller's own store window. A port of our client's `UI/Market/MarketWindow.cpp`,
`Network/Reforge/MarketPackets.cpp` and `GameLogic/Reforge/ReforgeMarket.h`. Reforge only
(`versions/shared/reforgeOnlyModules.ts`); Babylon's own `marketplace` module is another thing and
stays off for reforge.

## Public API
- `ReforgeMarket` (`state.ts`): the filter, the search field (`draft`), the page the server sent,
  the selected offer, the open board, the teleport refusal, the price ceilings and the E8 06 store
  currencies; actions `open`, `close`, `requestSearch`, `resetFilters`, `toggleBoard`,
  `pickCategory`, `pickCurrency`, `toggleSort`, `toggleTier`, `turnPage`, `select`, `walk`.
- `MARKET_WINDOW`: the window id. The rules (`rules.ts`): the server's enums and currency values.

## How it works
- Talking to the market keeper (Wandering Merchant Zyro, NPC 568, S PlayerActions/Market/
  MarketNpcTalkPlugIn.cs) makes the server send E8 05 Result 0: the board opens and asks for its
  page. E8 05 Result 1 only carries the price ceilings.
- Searches are paced as our client paces them: at most one every 600 ms (the server drops any
  sooner than 500 ms), and an open board repeats the last one every 8 s. A 100 ms timer runs only
  while the board is open.
- The search text goes out as UTF-8 cut to 16 bytes without splitting a character (our client's
  `Utf8Within`); the generated setter would write UTF-16 code units.
- A listing's item is read with the extended codec (`readItem`) when all its bytes are inside the
  12 (or 15) byte room; the server cuts sockets to fit and clears what cannot be cut.

## Packets
- E8 01 `MarketSearchResponse` (hand-written on the server, S RemoteView/Market/MarketViewPlugIn.cs):
  10-byte header, 83-byte listings (86 with a 15-byte item, read when every listing fits).
- E8 04 `MarketTeleportResponse`: success closes the board, a refusal shows its line for 6 s.
- E8 05 `MarketOpenResponse`: opens the board, keeps the W Coin / jewel / zen box ceilings.
- E8 03 `MarketPriceResponse`, E8 02 `MarketBuyResponse`: a chat line.
- E8 06 `MarketStoreCurrencies` (hand-written, `versions/reforge/packets/marketStoreCurrencies.ts`):
  the currency of each priced slot of the store being looked at, kept in `storeCurrencies`.
- Sent: E8 01 `MarketSearchRequest`, E8 04 `MarketTeleportRequest`.

## Not yet
- Setting a non-zen price (E8 03) from the personal store's price dialog, and showing a store's
  W Coin / jewel prices in its window from `storeCurrencies`: Babylon's personal shop window takes
  a zen price only.
- The Mu Reforge menu (`windows/reforge_menu`) opens the board too, as our client's does.

## Depends on / used by
- uses: `session` (sending), `chat` (lines), `controllers/item_rules` (item codec),
  `controllers/interface` (the window's open state), `versions/reforge/packets`.
- used by: `versions/shared/ui/windows/reforge_market/`.

## Tests
- `market.test.ts`: E8 01 / 03 / 04 / 05 / 06 parsed from bytes the C# writers lay out, the search
  and teleport requests built byte for byte, the pacing and the tier toggle.
