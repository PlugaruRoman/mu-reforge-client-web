# vip

Mu Reforge's account-wide VIP shop (C1 D7): four 30-day tiers bought with W Coin (C). A port of our
client's `UI/Vip/VipShopWindow.cpp`, `Network/Reforge/VipPackets.cpp` and
`GameLogic/Reforge/ReforgeVip.cpp`. Reforge only (`versions/shared/reforgeOnlyModules.ts`).

## Public API
- `Vip` (`state.ts`): the seconds left per tier, the prices, the W Coin balance and the last buy
  answer; the shop's rules (`remainingAt`, `isBuyable`, `canAfford`, `bundleSavings`,
  `replacesSingles`, `refusal`); actions `requestStatus`, `buy`.
- `VIP_WINDOW`, `TIER_COUNT`, `ALL_INCLUSIVE`, `DURATION_DAYS`, `VipBuyResult`.

## How it works
- Experience, Drop and Craft stack, each on its own clock; All Inclusive holds them all, and a single
  tier cannot be bought while it runs. Buying All Inclusive over single tiers replaces them.
- The times count down locally from the last report; the open window asks again every minute.
- A purchase waits for its answer at most 5 s before the buttons work again.

## Packets
- D7 01 `VipStatus` (40 bytes) and D7 02 `VipBuyResult` (25 bytes), hand-written on the server
  (S GameServer/RemoteView/Vip/VipViewPlugIn.cs); classes in `versions/reforge/packets/accountSystems.ts`.
- Sent: C1 D7 01 (status), C1 D7 02 `[VipType]` with VipType = tier index + 1
  (S MessageHandler/Vip/VipBuyRequestHandlerPlugIn.cs).

## Depends on / used by
- uses: `session`. Used by: `versions/shared/ui/windows/vip_shop` (key K, the inventory's VIP tab).
