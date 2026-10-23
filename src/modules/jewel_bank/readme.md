# jewel_bank

Mu Reforge's account-wide jewel bank (C1 D3): 14 jewels stored as counts, withdrawn 1/10/20/30 at a
time, deposited by a right click in the bag while the bank is open. A port of our client's
`UI/JewelBank/JewelBankWindow.cpp`, `JewelBankDeposit.cpp`, `Network/Reforge/JewelBankPackets.cpp`
and `GameLogic/Reforge/ReforgeJewelBank.cpp`. Reforge only (`versions/shared/reforgeOnlyModules.ts`).

## Public API
- `JewelBank` (`state.ts`): the counts, the withdrawal amount; actions `requestList`, `withdraw`,
  `deposit`. `BANK_JEWELS` (the server's JewelBankItemType order with each packed bundle),
  `isDepositable`, `WITHDRAW_AMOUNTS`, `JewelBankSource`, `JEWEL_BANK_WINDOW`.

## How it works
- The server takes a loose jewel of level 0 or a packed bundle of one; it answers every deposit or
  withdrawal with a new list and moves the item itself.
- Vault deposits (source 2) are in the codec, but no vault click sends one yet.

## Packets
- D3 01 `JewelBankList`, D3 02-04 requests: generated from our server's XML
  (`versions/reforge/packets/*Packets.ts`). The list is read by length, so a shorter one leaves the
  missing jewels at 0 (our client's `ParseJewelBankList`).

## Depends on / used by
- uses: `session`. Used by: `versions/shared/ui/windows/jewel_bank` (key J, the inventory's tab and
  its right click).
