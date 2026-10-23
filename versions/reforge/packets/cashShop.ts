/**
 * Our server's X-shop (in-game cash shop) and rental item frames, all C1 D2, all written by hand
 * (S GameServer/RemoteView/CashShop/CashShopViewPlugIn.cs, RemoteView/Inventory/PeriodItemViewPlugIn.cs),
 * none in its XML. The original client's `PMSG_CASHSHOP_*` / `PMSG_PERIODITEMEX_*` layouts, plus our
 * D2 60 (the price of one more inventory bag). Read by `modules/xshop/net.ts`; our client reads them in
 * Network/Server/WSclient.cpp `ReceiveIGS_*` / `ReceivePeriodItemList*` and Reforge/InventoryExtensionPackets.cpp.
 */
const frame = <N extends string>(name: N, subCode: number, length: number, sentWhen: string) =>
  class {
    buffer!: DataView;
    static readonly Name: N = name;
    static readonly HeaderType = 'C1HeaderWithSubCode';
    static readonly HeaderCode = 0xc1;
    static readonly Direction = 'ServerToClient';
    static readonly SentWhen = sentWhen;
    static readonly CausedReaction = 'The X-shop window or the item tooltips follow it.';
    static readonly Length = length;
    static readonly LengthSize = 1;
    static readonly DataOffset = 2;
    static readonly Code = 0xd2;
    static readonly SubCode = subCode;

    constructor(buffer?: DataView) {
      if (buffer) this.buffer = buffer;
    }
  };

/** D2 01, 45 bytes: view type at 4, then five doubles LE: total cash, W Coin (C), W Coin (P), Goblin Points, mileage. */
export const CashShopPointsPacket = frame('CashShopPoints', 0x01, 45, 'The balance was asked for (D2 01).');
/** D2 02, 5 bytes: open result at 4 (non-zero = open). */
export const CashShopOpenResultPacket = frame('CashShopOpenResult', 0x02, 5, 'The shop was asked to open (D2 02).');
/** D2 03, 9 bytes: result at 4, items left (i32 LE) at 5. */
export const CashShopBuyResultPacket = frame('CashShopBuyResult', 0x03, 9, 'A purchase was asked for (D2 03).');
/** D2 06, 12 bytes: total items, items on this page, page, page count; u16 LE from 4. */
export const CashShopStorageCountPacket = frame('CashShopStorageCount', 0x06, 12, 'The storage was asked for (D2 05).');
/** D2 0B, 5 bytes: use result at 4. */
export const CashShopStorageUseResultPacket = frame('CashShopStorageUseResult', 0x0b, 5, 'A storage item was used (D2 0B).');
/** D2 0C, 10 bytes: script zone, year, year id; u16 LE from 4. */
export const CashShopScriptVersionPacket = frame('CashShopScriptVersion', 0x0c, 10, 'The hero entered the world.');
/** D2 0D, 33 bytes: storage index, item seq, group code, product seq, price seq (i32 LE from 4), cash (double LE at 24), type at 32. */
export const CashShopStorageItemPacket = frame('CashShopStorageItem', 0x0d, 33, 'After the storage count, once per item on the page.');
/** D2 11, 5 bytes: how many D2 12 follow. */
export const PeriodItemCountPacket = frame('PeriodItemCount', 0x11, 5, 'The rental items of the hero changed.');
/** D2 12, 12 bytes: item code (u16 LE, group * 512 + number), slot (u16 LE), expiry (i32 LE unix seconds). */
export const PeriodItemPacket = frame('PeriodItem', 0x12, 12, 'After the rental count, once per rental item.');
/** D2 15, 10 bytes: banner zone, year, year id; u16 LE from 4. */
export const CashShopBannerVersionPacket = frame('CashShopBannerVersion', 0x15, 10, 'The hero entered the world.');
/** D2 60, 9 bytes: price of one inventory bag (u32 LE at 4), currency at 8 (0 W Coin C, 1 W Coin P, 2 Goblin Points). */
export const InventoryExtensionPricePacket = frame('InventoryExtensionPrice', 0x60, 9, 'The bag price was asked for (D2 60).');

export const CASH_SHOP_PACKETS = [
  CashShopPointsPacket,
  CashShopOpenResultPacket,
  CashShopBuyResultPacket,
  CashShopStorageCountPacket,
  CashShopStorageUseResultPacket,
  CashShopScriptVersionPacket,
  CashShopStorageItemPacket,
  PeriodItemCountPacket,
  PeriodItemPacket,
  CashShopBannerVersionPacket,
  InventoryExtensionPricePacket,
] as const;
