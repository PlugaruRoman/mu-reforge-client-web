# item_collections

Mu Reforge's Item Collections (our server only, in `versions/shared/reforgeOnlyModules.ts`): the
account registers items into collections (the item is destroyed) and a completed collection grants
a permanent bonus to every character. Ported from our client's `UI/ItemCollections/`,
`GameLogic/Reforge/ReforgeItemCollections.cpp` and `Network/Reforge/ItemCollectionPackets.cpp`.

## Public API
- `ItemCollections` (`state.ts`): `collections`, `hasCatalog`, `requestList()` (FA 01 out),
  `register(number, slot)` (FA 02 out).
- `catalog.ts` helpers the window reads: `SlotFlag`, `has`, `canRegister`, `filledCount`,
  `isComplete`, `summarize`, `visibleIndexes`, `bonusFormat`, `formatHundredths`.

## How it works
- The packets are hand-written on the server (no XML): `catalog.ts` reads and builds them byte for
  byte (S `GameServer/RemoteView/ItemCollections/ItemCollectionViewPlugIn.cs`,
  `GameServer/MessageHandler/ItemCollections/*.cs`). The dispatcher knows them from
  `versions/reforge/packets/itemCollections.ts` (`ItemCollectionList`, `ItemCollectionRegisterResult`).
- Slots name the item by group and number (no item bytes), so the window draws a plain item of that
  kind with the slot's level, excellent and ancient look.
- The window (`versions/shared/ui/windows/item_collections/`, `;` as in our client) asks for the
  catalog each time it opens. A click on a green slot (an inventory item fits, flag 0x04) asks, after a
  confirmation, to register: collection, slot and inventory slot 0xFF, so the server picks the
  weakest fitting item. Success plays the get-item sound and the server sends the catalog again;
  a refusal is a red line and the catalog is asked for again; "not now" is the server's own chat line.
- Client FA frames reach the server only through a proxy with `BAND=off` (`proxy/clientFrames.ts`).

## Packets
- in: C2 FA 01 catalog, C1 FA 02 register answer (`RegisterResult` in `catalog.ts`).
- out: C1 04 FA 01 list request, C1 08 FA 02 `[collection u16 LE][slot][inventory slot]`.

## Depends on / used by
- uses: `session` (sending), `chat` (refusal lines), `controllers/sound`.
- used by: `versions/shared/ui/windows/item_collections/`.

## Not yet
- Collection names show the server's (English) name; our client has a translated table (`ItemColName1-50`).
- It opens with `;`, the Mu Reforge menu (N, `windows/reforge_menu`) and the inventory's tab strip, as in
  our client.

## Tests
- `catalog.test.ts`: the catalog and answer parsers on bytes written as the C# writer writes them,
  the two requests, the bonus text helpers.
- `net.test.ts`: the listeners fill the state; a refusal asks for the catalog again.
