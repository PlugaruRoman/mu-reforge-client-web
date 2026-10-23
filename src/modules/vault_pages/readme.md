# vault_pages

Mu Reforge's paged vault: the warehouse keeps several 8x15 pages (3, 5 with VIP) and the client sees
only the active one (S `GameLogic/PlayerActions/Vault/VaultPageAction.cs`, `VaultStorages`). Our
client: `GameLogic/Reforge/ReforgeVaultPages.h`, `UI/Reforge/ReforgeVaultPages.cpp`. Reforge only
(`versions/shared/reforgeOnlyModules.ts`); requires `vault`.

## Public API
- `VaultPages` (`index.ts`): `current`, `count`, `paged`, `hasPrev`, `hasNext`, `request(-1 | 1)`.

## How it works
- `VaultPageInfo` (C2 DD 00, current at 5, count at 6) arrives after the vault's items when it opens
  and after every page change; a current page outside the count is ignored.
- `request` sends `VaultPageChangeRequest` (C1 DD 00, page at 4) only with nothing in hand, no move
  pending and the pin entered on a locked vault (the server refuses otherwise). It empties the grid
  first: the server sends the new page's `StoreItemList` without a clear.
- A closed vault resets the page info (a mobx reaction on `Economy.vaultOpen`).
- The arrows and "2/5" are `versions/shared/ui/windows/vault/pager.tsx`, drawn in the vault window
  only while this module is on and the vault has more than one page.

## Depends on / used by
- uses: `economy` (vault state), `inventory` (`Bag`), `session`, the reforge generated request class.
- used by: the vault window's pager.

## Tests
- `net.test.ts`: the page info frame, the request bytes, the refusals and the reset on close.
