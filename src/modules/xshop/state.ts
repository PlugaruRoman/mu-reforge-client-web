import { makeAutoObservable, observable, runInAction } from 'mobx';
import { t, type TextKey } from '@/i18n';
import {
  CashShopItemBuyRequestPacket,
  CashShopOpenStatePacket,
  CashShopPointInfoRequestPacket,
  CashShopStorageItemConsumeRequestPacket,
  CashShopStorageListRequestPacket,
} from '@versions/shared/packets/ClientToServerPackets';
import { addNotification } from '../chat';
import { Session } from '../session';
import { Catalog, balanceOf, type XShopPackage, type XShopProduct } from './catalog';

/** One line of the shop storage (D2 0D, `PMSG_CASHSHOP_STORAGELIST`). */
export type StorageEntry = {
  storageIndex: number;
  itemSeq: number;
  productSeq: number;
  priceSeq: number;
  cash: number;
  type: number;
};

export type Points = { total: number; credit: number; prepaid: number; goblin: number };

/** The storage box (`'S'`); `'G'` is the gift box, always empty on our server (S CashShopStorageListRequestHandlerPlugIn.cs). */
export const STORAGE_CODE = 0x53;
/** `chItemType` 'P': a product (S CashShopViewPlugIn.cs:225). */
const PRODUCT_TYPE = 0x50;
/** The packages one page of the grid shows. */
export const PACKAGES_PER_PAGE = 9;

/** `ReceiveIGS_BuyItem` (WSclient.cpp:12772) result texts; anything else is "unknown error". */
const BUY_RESULT: Record<number, TextKey> = {
  0: 'xshop.buy.done',
  1: 'xshop.buy.noMoney',
  2: 'xshop.buy.noSpace',
  3: 'xshop.buy.soldOut',
  4: 'xshop.buy.notAvailable',
  5: 'xshop.buy.noLonger',
  6: 'xshop.buy.cannot',
  7: 'xshop.buy.event',
  8: 'xshop.buy.eventLimit',
  9: 'xshop.buy.wrongCoin',
  254: 'xshop.buy.database',
  255: 'xshop.buy.database',
};

/** `ReceiveIGS_UseStorageItem` (WSclient.cpp:13016). */
const USE_RESULT: Record<number, TextKey> = {
  0: 'xshop.use.done',
  1: 'xshop.use.missing',
  21: 'xshop.use.noSpace',
  22: 'xshop.use.cannot',
  24: 'xshop.use.conflict',
  254: 'xshop.use.error',
  255: 'xshop.use.error',
};

/**
 * `CInGameShop` / `CInGameShopSystem` (GameShop/InGameShop.cpp, InGameShopSystem.cpp): the X-shop. X or the
 * main frame's shop button asks the server to open it (D2 02), which answers with the open result; then the
 * balance (D2 01) and the first storage page (D2 05) are asked for, as `ReceiveIGS_ShopOpenResult` does.
 */
export const XShop = new (class {
  open = false;
  /** The open request is out (`SetIsRequestShopOpenning`). */
  requesting = false;
  /** D2 0C's year id; the catalog follows it. */
  scriptYear = 76;
  catalog: Catalog | null = null;
  points: Points = { total: 0, credit: 0, prepaid: 0, goblin: 0 };
  zone = 0;
  category = 0;
  page = 0;
  /** The package whose price tiers the buy panel shows. */
  buying: XShopPackage | null = null;
  storage: StorageEntry[] = [];
  storageTotal = 0;
  storagePage = 1;
  storagePages = 1;
  /** The last answer, shown in the window. */
  message: { text: string; good: boolean } | null = null;
  /** D2 60: the price of one more inventory bag. */
  bagPrice: { price: number; currency: number } | null = null;

  private loading: Promise<void> | null = null;

  constructor() {
    makeAutoObservable(this, { catalog: observable.ref, buying: observable.ref }, { autoBind: true });
  }

  /** The catalog of the current script year, loaded once (its own chunk). */
  loadCatalog(): Promise<void> {
    this.loading ??= import('./catalogData').then(({ CATALOGS }) =>
      runInAction(() => {
        const raw = CATALOGS[this.scriptYear] ?? CATALOGS[76];
        this.catalog = new Catalog(raw);
        if (!this.catalog.zones.some(z => z.seq === this.zone)) this.selectZone(this.catalog.zones[0]?.seq ?? 0);
      })
    );
    return this.loading;
  }

  /** D2 0C: the catalog year changed; the next open reloads it. */
  setScriptYear(year: number): void {
    if (year === this.scriptYear && this.catalog) return;
    this.scriptYear = year;
    this.catalog = null;
    this.loading = null;
  }

  /** X / the shop button (HotKey.cpp:320-358): open asks the server, close tells it. */
  toggle(): void {
    if (this.open) {
      this.close();
      return;
    }
    if (this.requesting) return;
    this.requesting = true;
    void this.loadCatalog();
    const p = CashShopOpenStatePacket.createPacket();
    p.IsClosed = false;
    Session.sendToGS(p.buffer);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.buying = null;
    const p = CashShopOpenStatePacket.createPacket();
    p.IsClosed = true;
    Session.sendToGS(p.buffer);
  }

  /** D2 02 (`ReceiveIGS_ShopOpenResult`). */
  openAnswered(success: boolean): void {
    this.requesting = false;
    if (!success) return;
    this.open = true;
    this.message = null;
    this.requestPoints();
    this.requestStorage(1);
  }

  /** The connection ended: nothing of the shop survives it. */
  reset(): void {
    this.open = false;
    this.requesting = false;
    this.buying = null;
    this.storage = [];
    this.message = null;
  }

  requestPoints(): void {
    Session.sendToGS(CashShopPointInfoRequestPacket.createPacket().buffer);
  }

  requestStorage(page: number): void {
    const p = CashShopStorageListRequestPacket.createPacket();
    p.PageIndex = page;
    p.InventoryType = STORAGE_CODE;
    Session.sendToGS(p.buffer);
  }

  setPoints(points: Points): void {
    this.points = points;
  }

  /** D2 06: the page the D2 0D lines that follow belong to. */
  storageCounted(total: number, page: number, pages: number): void {
    this.storageTotal = total;
    this.storagePage = Math.max(1, page);
    this.storagePages = Math.max(1, pages);
    this.storage = [];
  }

  addStorageItem(entry: StorageEntry): void {
    this.storage.push(entry);
  }

  selectZone(zone: number): void {
    this.zone = zone;
    this.category = this.catalog?.categoriesOf(zone)[0]?.seq ?? zone;
    this.page = 0;
    this.buying = null;
  }

  selectCategory(category: number): void {
    this.category = category;
    this.page = 0;
    this.buying = null;
  }

  get packages(): XShopPackage[] {
    return this.catalog?.packagesOf(this.category) ?? [];
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.packages.length / PACKAGES_PER_PAGE));
  }

  get pagePackages(): XShopPackage[] {
    return this.packages.slice(this.page * PACKAGES_PER_PAGE, (this.page + 1) * PACKAGES_PER_PAGE);
  }

  turnPage(delta: number): void {
    this.page = Math.min(this.pageCount - 1, Math.max(0, this.page + delta));
  }

  /** `IsAffordable` (ReforgeShopRules.cpp): Buy stays off when the balance in the price's unit is short. */
  affordable(cashName: string, price: number): boolean {
    const p = this.points;
    switch (balanceOf(cashName)) {
      case 'credit':
        return p.credit >= price;
      case 'prepaid':
        return p.prepaid >= price;
      case 'points':
        return p.goblin >= price;
      default:
        return p.total >= price;
    }
  }

  startBuy(pkg: XShopPackage | null): void {
    this.buying = pkg;
  }

  /**
   * `SendCashShopItemBuyRequest` (MsgBoxIGSBuyConfirm.cpp:36): package seq, display seq, price seq (0 for a
   * flat-priced package), item code, cash type. The server reads the package and the price seq
   * (S CashShopItemBuyRequestHandlerPlugIn.cs).
   */
  buy(pkg: XShopPackage, tier?: XShopProduct): void {
    const p = CashShopItemBuyRequestPacket.createPacket();
    p.PackageMainIndex = pkg.seq;
    p.Category = pkg.category;
    p.ProductMainIndex = tier?.priceSeq ?? 0;
    p.ItemIndex = tier?.itemCode ?? pkg.itemCode;
    p.CoinIndex = pkg.cashType;
    p.MileageFlag = 0;
    Session.sendToGS(p.buffer);
    this.buying = null;
  }

  /** D2 03. Success asks for the balance and the storage again. */
  buyAnswered(result: number): void {
    this.say(BUY_RESULT[result] ?? 'xshop.unknownError', result === 0);
    if (result !== 0) return;
    this.requestPoints();
    this.requestStorage(1);
  }

  /**
   * `SendCashShopStorageItemConsumeRequest` (MsgBoxIGSUseBuffConfirm.cpp:25): storage index, item seq, item
   * code, type. The server takes the item seq (S CashShopStorageItemConsumeRequestHandlerPlugIn.cs).
   */
  useStorageItem(entry: StorageEntry): void {
    const p = CashShopStorageItemConsumeRequestPacket.createPacket();
    p.BaseItemCode = entry.storageIndex;
    p.MainItemCode = entry.itemSeq;
    p.ItemIndex = this.catalog?.product(entry.priceSeq)?.itemCode ?? 0;
    p.ProductType = PRODUCT_TYPE;
    Session.sendToGS(p.buffer);
    this.requestPoints();
  }

  /** D2 0B. Success shows the storage again (`RefreshCashShopStorage`). */
  useAnswered(result: number): void {
    this.say(USE_RESULT[result] ?? 'xshop.unknownError', result === 0);
    if (result === 0) this.requestStorage(this.storage.length > 1 ? this.storagePage : Math.max(1, this.storagePage - 1));
  }

  setBagPrice(price: number, currency: number): void {
    this.bagPrice = { price, currency };
  }

  private say(key: TextKey, good: boolean): void {
    const text = t(key);
    this.message = { text, good };
    addNotification(text, good ? 'info' : 'error');
  }
})();
