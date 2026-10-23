import { ClosePlayerShopDialogPacket, PlayerShopBuyResultExtendedPacket, PlayerShopBuyResultPacket, PlayerShopBuyResultResultKindEnum, PlayerShopClosedPacket, PlayerShopItemListExtendedPacket, PlayerShopItemListPacket, PlayerShopItemSoldToPlayerPacket, PlayerShopOpenSuccessfulPacket, PlayerShopSetItemPriceResponseItemPriceSetResultEnum, PlayerShopSetItemPriceResponsePacket, PlayerShopsPacket } from '@versions/shared/packets/ServerToClientPackets';
import { Economy, type ShopStock } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { ItemSerializer, readItemData, readItemList } from '@/controllers/item_rules';
import type { Item } from '@/ecs/world';
import { PERSONAL_SHOP_SLOTS, StorageKind, localIndexOf } from '../inventory/itemStorage';
import { Social } from '../social/social';
import { Hero } from '@/modules/hero';
import { t, type TextKey } from '@/i18n';
import { cleanName } from '../chat/chat';
import { runInAction } from 'mobx';

/**
 * The stall list quotes its slots the way `CNewUIPurchaseShopInventory`
 * indexes them - `MAX_MY_INVENTORY_EX_INDEX` + square. A slot that is
 * already inside the 8×4 grid is taken as a square, so a server that counts
 * from zero still fills the window instead of leaving it empty.
 */
function shopSquareOf(slot: number): number {
  if (slot >= 0 && slot < PERSONAL_SHOP_SLOTS) return slot;
  return localIndexOf(StorageKind.PersonalShop, slot);
}

/** One `PlayerShopItemExtended` head at `at`: price u32, barter type u16, barter amount u16, slot. */
export function readShopEntry(packet: DataView, at: number, item: Item): ShopStock {
  const amount = packet.getUint16(at + 6, true);
  const entry: ShopStock = { slot: packet.getUint8(at + 8), item, price: packet.getUint32(at, true) };
  if (amount > 0) entry.barter = { itemType: packet.getUint16(at + 4, true), amount };
  return entry;
}

/** The other player's stall, from either list packet. */
function showShop(
  p: { Success: boolean; PlayerId: number; PlayerName: string; ShopName: string },
  entries: ShopStock[]
): void {
  if (!p.Success) {
    Social.errorMessage(t('personalShop.openFailed'));
    return;
  }

  const items = new Array<ShopStock | null>(PERSONAL_SHOP_SLOTS).fill(null);

  for (const entry of entries) {
    const square = shopSquareOf(entry.slot);
    if (square < 0 || square >= PERSONAL_SHOP_SLOTS) continue;
    items[square] = entry;
  }

  Economy.showShop({
    playerId: p.PlayerId & 0x7fff,
    playerName: cleanName(p.PlayerName),
    shopName: cleanName(p.ShopName),
    items,
  });
}

/**
 * The bought item rides this packet and nothing else: OpenMU's
 * `BuyRequestAction` puts it in the inventory server-side and reports it
 * here, with no `ItemAddedToInventory` behind it. Dropping the payload left
 * the slot empty until the next login.
 */
function shopBuyResult(result: PlayerShopBuyResultResultKindEnum, slot: number, item: () => Item): void {
  if (result !== PlayerShopBuyResultResultKindEnum.Success) {
    Economy.shopBuyResult(result);
    return;
  }

  // ReceivePurchaseItem (WSclient.cpp:9526-9597) plays nothing.
  const bought = item();
  runInAction(() => {
    Hero.items[slot] = bought;
  });

  Hero.syncPlayerAppearance();
}

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // --- Personal shop (CNewUIMyShopInventory / CNewUIPurchaseShopInventory) -----

  EventBus.on('PlayerShopSetItemPriceResponse', packet => {
    const p = new PlayerShopSetItemPriceResponsePacket(packet);
    const E = PlayerShopSetItemPriceResponseItemPriceSetResultEnum;

    const reason: Partial<Record<number, TextKey>> = {
      [E.Failed]: 'personalShop.disabled',
      [E.ItemSlotOutOfRange]: 'personalShop.slotNotInShop',
      [E.ItemNotFound]: 'personalShop.itemGone',
      [E.PriceNegative]: 'notify.negativePrice',
      [E.ItemIsBlocked]: 'personalShop.cannotSell',
      [E.CharacterLevelTooLow]: 'personalShop.needLevel',
    };

    Economy.itemPriceResult(
      p.InventorySlot,
      p.Result === E.Success,
      t(reason[p.Result] ?? 'personalShop.priceNotSet')
    );
  });

  EventBus.on('PlayerShopOpenSuccessful', packet => {
    const p = new PlayerShopOpenSuccessfulPacket(packet);
    Economy.sellingStarted(p.Success);
  });

  EventBus.on('PlayerShopItemSoldToPlayer', packet => {
    const p = new PlayerShopItemSoldToPlayerPacket(packet);
    Economy.itemSold(p.InventorySlot, cleanName(p.BuyerName));
  });

  // `PlayerShops` (0x3F 0x00): the shop titles floating over players in scope.
  // The ids here carry the same 0x8000 flag bit as the scope packets, so they
  // are masked down to the net id the world entities are keyed by - the name
  // tags look a shop title up by `entity.netId`.
  EventBus.on('PlayerShops', packet => {
    const p = new PlayerShopsPacket(packet);
    for (const shop of p.getShops()) {
      Economy.setShopTitle(shop.PlayerId & 0x7fff, cleanName(shop.StoreName));
    }
  });

  EventBus.on('PlayerShopClosed', packet => {
    const p = new PlayerShopClosedPacket(packet);
    const maskedId = p.PlayerId & 0x7fff;
    Economy.setShopTitle(maskedId, null);
    Economy.dropBrowsedShop(maskedId);

    // The server's confirmation of our own close (or a forced close): state
    // only. `stopSelling()` would send PlayerShopClose again, which OpenMU
    // answers with another PlayerShopClosed - 600 round trips in one second
    // (verified live).
    if (Hero.playerId === maskedId) Economy.sellingStopped();
  });

  EventBus.on('ClosePlayerShopDialog', packet => {
    const p = new ClosePlayerShopDialogPacket(packet);
    Economy.dropBrowsedShop(p.PlayerId & 0x7fff);
  });

  EventBus.on('PlayerShopItemList', packet => {
    const p = new PlayerShopItemListPacket(packet);
    showShop(p, p.getItems().map(entry => ({
      slot: entry.ItemSlot,
      item: ItemSerializer.DeserializeItem(new Uint8Array(entry.ItemData.buffer)),
      price: entry.Price,
    })));
  });

  // 3F 05 at 106.3: per item its zen price (u32), the barter item type and amount (u16 each), the
  // slot, then the item from 55 (S RemoteView/PlayerShop/ShowShopItemListExtendedPlugIn.cs:48-78).
  // A barter price is an amount > 0 (client PersonalShopCurrency.cpp DecodeExtendedPrice); our server
  // writes none yet (the plug-in's "todo"), so only the zen price reaches the tooltip.
  EventBus.on('PlayerShopItemListExtended', packet => {
    const p = new PlayerShopItemListExtendedPacket(packet);
    showShop(p, readItemList(packet, 55, p.ItemCount, 9).map(({ at, item }) => readShopEntry(packet, at, item)));
  });

  EventBus.on('PlayerShopBuyResult', packet => {
    const p = new PlayerShopBuyResultPacket(packet);
    shopBuyResult(p.Result, p.ItemSlot, () => ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer)));
  });

  // 3F 06 at 106.3: seller id, result, slot, then the item from 8 (S RemoteView/Inventory/PlayerShopBuyRequestResultExtendedPlugIn.cs:34-50).
  EventBus.on('PlayerShopBuyResultExtended', packet => {
    const p = new PlayerShopBuyResultExtendedPacket(packet);
    shopBuyResult(p.Result as number as PlayerShopBuyResultResultKindEnum, p.ItemSlot, () => readItemData(p.ItemData));
  });
}
