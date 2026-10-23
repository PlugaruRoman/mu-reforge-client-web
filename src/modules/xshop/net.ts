import { EventBus } from '@/core/eventBus';
import { XShop } from './state';
import { forgetPeriodItems, periodItemArrived, periodItemsCounted } from './periodItems';

/**
 * Registers this module's packet listeners (see ../module.ts). Every frame is C1 D2, hand-written on our
 * server (S RemoteView/CashShop/CashShopViewPlugIn.cs, RemoteView/Inventory/PeriodItemViewPlugIn.cs); the
 * offsets are the ones `versions/reforge/packets/cashShop.ts` documents.
 */
export function installNet(): void {
  // D2 01: five doubles LE from 5 (total, W Coin C, W Coin P, Goblin Points, mileage) (CashShopViewPlugIn.cs:98-118).
  EventBus.on('CashShopPoints', p => {
    if (p.byteLength < 37) return;
    XShop.setPoints({
      total: p.getFloat64(5, true),
      credit: p.getFloat64(13, true),
      prepaid: p.getFloat64(21, true),
      goblin: p.getFloat64(29, true),
    });
  });

  EventBus.on('CashShopOpenResult', p => XShop.openAnswered(p.getUint8(4) !== 0));
  EventBus.on('CashShopBuyResult', p => XShop.buyAnswered(p.getUint8(4)));

  // D2 06: total, on this page, page, pages; u16 LE from 4 (CashShopViewPlugIn.cs:184-197).
  EventBus.on('CashShopStorageCount', p => XShop.storageCounted(p.getUint16(4, true), p.getUint16(8, true), p.getUint16(10, true)));

  // D2 0D: i32 LE storage index, item seq, group, product seq, price seq from 4, double at 24, type at 32 (:206-226).
  EventBus.on('CashShopStorageItem', p =>
    XShop.addStorageItem({
      storageIndex: p.getInt32(4, true),
      itemSeq: p.getInt32(8, true),
      productSeq: p.getInt32(16, true),
      priceSeq: p.getInt32(20, true),
      cash: p.getFloat64(24, true),
      type: p.getUint8(32),
    })
  );

  EventBus.on('CashShopStorageUseResult', p => XShop.useAnswered(p.getUint8(4)));

  // D2 0C: zone, year, year id (u16 LE from 4); the year id picks the catalog (CashShopViewPlugIn.cs:243-262).
  EventBus.on('CashShopScriptVersion', p => XShop.setScriptYear(p.getUint16(8, true)));
  // D2 15: the banner; we draw none.
  EventBus.on('CashShopBannerVersion', () => undefined);

  // D2 60: price u32 LE at 4, currency at 8 (CashShopViewPlugIn.cs:130-151).
  EventBus.on('InventoryExtensionPrice', p => XShop.setBagPrice(p.getUint32(4, true), p.getUint8(8)));

  // D2 11 / D2 12 (PeriodItemViewPlugIn.cs:33-64).
  EventBus.on('PeriodItemCount', () => periodItemsCounted());
  EventBus.on('PeriodItem', p => periodItemArrived(p.getUint16(6, true), p.getUint16(4, true), p.getInt32(8, true)));

  EventBus.on('wsClosed', () => {
    XShop.reset();
    forgetPeriodItems();
  });
}
