import './style.less';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { t } from '@/i18n';
import { useWindowChrome, MuTableFrame } from '@/controllers/interface/components/mu_window';
import { useMuSprite } from '@/controllers/interface/components/mu_sprite';
import { ItemIcon } from '@/controllers/interface/components/item_icon';
import { togglesWindow } from '@/controllers/interface/components/module_window';
import { useEventBus } from '@/controllers/interface/hooks';
import { uiClick } from '@/controllers/sound/sfx';
import { XShop, itemOfCode, type StorageEntry, type XShopPackage, type XShopProduct } from '@/modules/xshop';
import {
  BACK_SPRITE,
  GRID_FRAME,
  HEIGHT,
  HOT_KEY,
  STORAGE_FRAME,
  WIDTH,
  WINDOW_ID,
} from './layout';

const amount = (n: number) => Math.floor(n).toLocaleString('en-US');

/** `Quantity 10 EA`, `Duration 7 Day(s)`: a tier's line in the buy panel (MsgBoxIGSBuySelectItem.cpp:275-312). */
function tierLabel(tier: XShopProduct): string {
  if (tier.property === 'Duration' && tier.value > 0) return t('xshopWindow.days', { count: Math.round(tier.value / 86400) });
  if ((tier.property === 'Quantity' || tier.property === 'Rate') && tier.value > 0) return `${tier.value} ${tier.unit}`.trim();
  return tier.name;
}

const PackageCard = observer(({ pkg }: { pkg: XShopPackage }) => (
  <div
    className={`xshop-card${XShop.buying === pkg ? ' selected' : ''}`}
    data-no-drag="true"
    title={pkg.description.replace(/#/g, '\n')}
    onClick={uiClick(() => XShop.startBuy(pkg))}
  >
    <div className="xshop-card-icon">{pkg.itemCode > 0 && <ItemIcon item={itemOfCode(pkg.itemCode)} />}</div>
    <div className="xshop-card-name">{pkg.name}</div>
    <div className="xshop-card-price">
      {amount(pkg.price)} <span className="unit">{pkg.cashName}</span>
    </div>
  </div>
));

/** `CMsgBoxIGSBuySelectItem` / `CMsgBoxIGSBuyPackageItem`: the tiers to pick from, then Buy. Gift stays off (ReforgeShopRules.h). */
const BuyPanel = observer(({ pkg }: { pkg: XShopPackage }) => {
  const tiers = XShop.catalog?.tiers(pkg) ?? [];
  const [chosen, setChosen] = useState(0);
  const tier = tiers[Math.min(chosen, tiers.length - 1)];
  const price = tier ? tier.price : pkg.price;
  const affordable = XShop.affordable(pkg.cashName, price);

  return (
    <div className="xshop-buy" data-no-drag="true">
      <div className="xshop-buy-title">{pkg.name}</div>
      <div className="xshop-buy-text">
        {pkg.description.split('#').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      {tiers.length > 0 && (
        <div className="xshop-buy-tiers">
          {tiers.map((tr, i) => (
            <label key={tr.priceSeq} className={i === chosen ? 'chosen' : ''}>
              <input type="radio" checked={i === chosen} onChange={() => setChosen(i)} />
              <span>{tierLabel(tr)}</span>
              <span className="price">
                {amount(tr.price)} {pkg.cashName}
              </span>
            </label>
          ))}
        </div>
      )}
      <div className="xshop-buy-price">
        {t('xshopWindow.price')}: {amount(price)} {pkg.cashName}
      </div>
      {!affordable && <div className="xshop-buy-short">{t('xshopWindow.notEnough')}</div>}
      <div className="xshop-buy-buttons">
        <button type="button" disabled={!affordable} onClick={uiClick(() => XShop.buy(pkg, tier))}>
          {t('xshopWindow.buy')}
        </button>
        <button type="button" disabled title={t('xshopWindow.giftOff')}>
          {t('xshopWindow.gift')}
        </button>
        <button type="button" onClick={uiClick(() => XShop.startBuy(null))}>
          {t('xshopWindow.cancel')}
        </button>
      </div>
    </div>
  );
});

const StorageRow = observer(({ entry }: { entry: StorageEntry }) => {
  const product = XShop.catalog?.product(entry.priceSeq);
  return (
    <div className="xshop-storage-row">
      <div className="xshop-storage-icon">{product && <ItemIcon item={itemOfCode(product.itemCode)} />}</div>
      <div className="xshop-storage-name">{product?.name ?? `#${entry.itemSeq}`}</div>
      <button type="button" data-no-drag="true" onClick={uiClick(() => XShop.useStorageItem(entry))}>
        {t('xshopWindow.use')}
      </button>
    </div>
  );
});

/**
 * `CInGameShop` (GameShop/InGameShop.cpp): the X-shop. The balances on top, the zones (W Coin (C), W Coin (P),
 * Goblin Point) and their categories as tabs, a page of packages, and the storage the bought items wait in
 * until "Use" moves them out. X (HotKey.cpp:320) or the main frame's shop button opens it.
 */
export const XShopWindow = observer(() => {
  const back = useMuSprite(BACK_SPRITE);
  const chrome = useWindowChrome(WINDOW_ID, { width: WIDTH, height: HEIGHT, onClose: () => XShop.close(), open: 'center' });

  useEventBus('keyPressed', key => {
    if (togglesWindow(HOT_KEY, key)) XShop.toggle();
  });

  if (!XShop.open) return null;
  const catalog = XShop.catalog;
  const categories = catalog?.categoriesOf(XShop.zone) ?? [];
  const p = XShop.points;

  return (
    <div
      ref={chrome.ref as React.Ref<HTMLDivElement>}
      role="dialog"
      aria-label={t('xshopWindow.title')}
      className="xshop-window"
      onPointerDown={chrome.onPointerDown}
      style={{ ...chrome.style, backgroundImage: back ? `url(${back.url})` : undefined }}
    >
      <div className="xshop-title">{t('xshopWindow.title')}</div>
      <div className="xshop-close" data-no-drag="true" onClick={uiClick(() => XShop.close())}>
        ×
      </div>

      <div className="xshop-points">
        <span>{t('xshopWindow.wcoinC')}: <b>{amount(p.credit)}</b></span>
        <span>{t('xshopWindow.wcoinP')}: <b>{amount(p.prepaid)}</b></span>
        <span>{t('xshopWindow.goblin')}: <b>{amount(p.goblin)}</b></span>
      </div>

      <div className="xshop-zones" data-no-drag="true">
        {catalog?.zones.map(z => (
          <div key={z.seq} className={`xshop-tab${z.seq === XShop.zone ? ' active' : ''}`} onClick={uiClick(() => XShop.selectZone(z.seq))}>
            {z.name}
          </div>
        ))}
      </div>
      <div className="xshop-categories" data-no-drag="true">
        {categories.map(c => (
          <div
            key={c.seq}
            className={`xshop-tab small${c.seq === XShop.category ? ' active' : ''}`}
            onClick={uiClick(() => XShop.selectCategory(c.seq))}
          >
            {c.name}
          </div>
        ))}
      </div>

      <MuTableFrame {...GRID_FRAME} />
      <div className="xshop-grid" style={{ left: GRID_FRAME.left + 6, top: GRID_FRAME.top + 6 }}>
        {!catalog && <div className="xshop-empty">{t('xshopWindow.loading')}</div>}
        {catalog && XShop.pagePackages.length === 0 && <div className="xshop-empty">{t('xshopWindow.noPackages')}</div>}
        {XShop.pagePackages.map(pkg => (
          <PackageCard key={`${pkg.seq}-${pkg.category}`} pkg={pkg} />
        ))}
      </div>
      <div className="xshop-pager" data-no-drag="true" style={{ left: GRID_FRAME.left, top: GRID_FRAME.top + GRID_FRAME.height + 2, width: GRID_FRAME.width }}>
        <button type="button" disabled={XShop.page === 0} onClick={uiClick(() => XShop.turnPage(-1))}>
          ‹
        </button>
        <span>
          {XShop.page + 1} / {XShop.pageCount}
        </span>
        <button type="button" disabled={XShop.page + 1 >= XShop.pageCount} onClick={uiClick(() => XShop.turnPage(1))}>
          ›
        </button>
      </div>

      <div className="xshop-storage-title" style={{ left: STORAGE_FRAME.left, top: STORAGE_FRAME.top - 16 }}>
        {t('xshopWindow.storage')} ({XShop.storageTotal})
      </div>
      <MuTableFrame {...STORAGE_FRAME} />
      <div
        className="xshop-storage scrollable"
        data-no-drag="true"
        style={{ left: STORAGE_FRAME.left + 6, top: STORAGE_FRAME.top + 6, width: STORAGE_FRAME.width - 12, height: STORAGE_FRAME.height - 12 }}
      >
        {XShop.storage.length === 0 && <div className="xshop-empty">{t('xshopWindow.storageEmpty')}</div>}
        {XShop.storage.map(e => (
          <StorageRow key={`${e.storageIndex}-${e.itemSeq}`} entry={e} />
        ))}
      </div>
      <div className="xshop-pager" data-no-drag="true" style={{ left: STORAGE_FRAME.left, top: STORAGE_FRAME.top + STORAGE_FRAME.height + 2, width: STORAGE_FRAME.width }}>
        <button type="button" disabled={XShop.storagePage <= 1} onClick={uiClick(() => XShop.requestStorage(XShop.storagePage - 1))}>
          ‹
        </button>
        <span>
          {XShop.storagePage} / {XShop.storagePages}
        </span>
        <button
          type="button"
          disabled={XShop.storagePage >= XShop.storagePages}
          onClick={uiClick(() => XShop.requestStorage(XShop.storagePage + 1))}
        >
          ›
        </button>
      </div>

      {XShop.message && <div className={`xshop-message${XShop.message.good ? ' good' : ''}`}>{XShop.message.text}</div>}

      {XShop.buying && <BuyPanel key={XShop.buying.seq} pkg={XShop.buying} />}
    </div>
  );
});
