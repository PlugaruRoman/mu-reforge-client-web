import { Economy } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { ItemCraftingResultPacket } from '@versions/shared/packets/ServerToClientPackets';
import { minItemLength, readItemData } from '@/controllers/item_rules';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // --- Chaos machine (CNewUIMixInventory) --------------------------------------

  EventBus.on('ItemCraftingResult', packet => {
    const p = new ItemCraftingResultPacket(packet);

    // The server always sends `NeededSpace` bytes, zeros without an item (S RemoteView/NPC/ShowItemCraftingResultPlugIn.cs:33-41).
    const item = p.ItemData.byteLength >= minItemLength() ? readItemData(p.ItemData) : null;

    Economy.craftingResult(p.Result, item);
  });

  EventBus.on('CraftingDialogClosed075', () => Economy.closeMix(false));
}
