import './style.less';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { MuText } from '@/controllers/interface/components/mu_text';
import { MuTableFrame, useWindowChrome } from '@/controllers/interface/components/mu_window';
import { useMuSprite } from '@/controllers/interface/components/mu_sprite';
import { ItemIcon } from '@/controllers/interface/components/item_icon';
import { mapName } from '@/modules/gm/gmMaps';
import {
  CURRENCIES,
  Currency,
  MARKET_WINDOW,
  Quality,
  ReforgeMarket,
  SortOrder,
  TIERS,
  currencyItem,
  type Listing,
} from '@/modules/reforge_market';
import { ItemTooltip } from '../../components/item_tooltip';
import {
  CATEGORY_COLUMNS,
  HEIGHT,
  TIER_CLASS,
  TIER_NAMES,
  WIDTH,
  categoryName,
  currencyName,
  teleportText,
} from './layout';

/**
 * `CMarketWindow` (our client's UI/Market/MarketWindow.cpp, reforge_market.rml): the market board
 * of Mu Reforge, a search over every open personal store. Search line, category and currency
 * boards, sort and tier chips, a page of offers with Walk, the status line and the pager. Opened
 * by the market keeper (NPC 568, E8 05); nothing is bought here, the seller's store sells it.
 */

const tierOf = (item: Listing['item']): string =>
  !item ? '' : item.isAncient ? 'anc' : item.isExcellent ? 'exc' : (item.socketCount ?? 0) > 0 ? 'socket' : '';

const grouped = (n: number) => n.toLocaleString('en-US');

const label = (key: Parameters<typeof t>[0] | null) => (key ? t(key) : '?');

/** The coin of a price: the jewel's or box's icon, or its name for zen and W Coin. */
const Coin = observer(({ currency }: { currency: number }) => {
  const item = currencyItem(currency);
  return (
    <span className="mk-coin" title={label(currencyName(currency))}>
      {item ? <ItemIcon item={{ group: item[0], num: item[1] }} /> : label(currencyName(currency))}
    </span>
  );
});

export const ReforgeMarketWindow = observer(() => {
  const back = useMuSprite('newui_msgbox_back.OZJ');
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const chrome = useWindowChrome(MARKET_WINDOW, { width: WIDTH, height: HEIGHT, onClose: () => ReforgeMarket.close() });
  const m = ReforgeMarket;
  if (!m.isOpen) return null;

  const { filter, page } = m;
  const pageCount = Math.max(1, page.pageCount);
  const selected = page.listings[m.selected];
  const hovered = hover && m.board === 0 ? page.listings[hover.index] : undefined;

  const location = !selected
    ? ''
    : t(selected.storeName ? 'marketBoard.locationWithStore' : 'marketBoard.location', {
        store: selected.storeName,
        seller: selected.sellerName,
        map: mapName(selected.mapNumber),
        x: selected.x,
        y: selected.y,
      });

  return (
    <div
      ref={chrome.ref as React.Ref<HTMLDivElement>}
      role="dialog"
      aria-label={t('marketBoard.title')}
      tabIndex={-1}
      className="reforge-market"
      onPointerDown={chrome.onPointerDown}
      style={{
        width: WIDTH,
        height: HEIGHT,
        backgroundImage: back ? `url(${back.url})` : undefined,
        backgroundSize: '100% 100%',
        ...chrome.style,
      }}
    >
      <MuTableFrame left={0} top={0} width={WIDTH} height={HEIGHT} />
      <MuText face="bold" className="mk-title" text={t('marketBoard.title')} />
      <div className="mk-close" data-no-drag="true" title={t('marketBoard.close')} onClick={() => m.close()}>
        x
      </div>

      <div className="mk-search" data-no-drag="true">
        <input
          type="text"
          spellCheck={false}
          maxLength={16}
          value={m.draft}
          placeholder={t('marketBoard.searchPlaceholder')}
          onChange={e => m.setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') m.requestSearch(0);
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
            e.stopPropagation();
          }}
        />
        <button className="mk-btn" onClick={() => m.requestSearch(0)}>
          {t('marketBoard.search')}
        </button>
        <button className="mk-btn" title={t('marketBoard.reset')} onClick={() => m.resetFilters()}>
          {t('marketBoard.resetLabel')}
        </button>
      </div>

      <div className="mk-filters" data-no-drag="true">
        <button
          className={`mk-filter${m.board === 1 ? ' open' : ''}${filter.category ? ' active' : ''}`}
          title={t('marketBoard.category')}
          onClick={() => m.toggleBoard(1)}
        >
          {t(categoryName(filter.category))}
        </button>
        <button
          className={`mk-filter${m.board === 2 ? ' open' : ''}${filter.currency !== Currency.Any ? ' active' : ''}`}
          title={t('marketBoard.pay')}
          onClick={() => m.toggleBoard(2)}
        >
          {label(currencyName(filter.currency))}
        </button>
        <button
          className={`mk-sort${filter.sortOrder === SortOrder.PriceAscending ? ' active' : ''}`}
          title={t('marketBoard.sortCheapest')}
          onClick={() => m.toggleSort(SortOrder.PriceAscending)}
        >
          ▲
        </button>
        <button
          className={`mk-sort${filter.sortOrder === SortOrder.PriceDescending ? ' active' : ''}`}
          title={t('marketBoard.sortPriciest')}
          onClick={() => m.toggleSort(SortOrder.PriceDescending)}
        >
          ▼
        </button>
      </div>
      <div className="mk-chips" data-no-drag="true">
        {[Quality.Any, ...TIERS].map(tier => (
          <button
            key={tier}
            className={`mk-chip ${TIER_CLASS[tier] ?? ''}${(tier === Quality.Any ? filter.quality === 0 : filter.quality & tier) ? ' active' : ''}`}
            onClick={() => m.toggleTier(tier)}
          >
            {t(TIER_NAMES[tier])}
          </button>
        ))}
      </div>

      <MuTableFrame left={8} top={84} width={WIDTH - 16} height={214} />
      <div className="mk-list" data-no-drag="true" onPointerLeave={() => setHover(null)}>
        {page.listings.map((listing, i) => (
          <div
            key={`${listing.sellerName}/${listing.storeSlot}`}
            className={`mk-row${i === m.selected ? ' selected' : ''}`}
            onClick={() => m.select(i)}
            onPointerMove={e => setHover({ index: i, x: e.clientX, y: e.clientY })}
          >
            <div className="mk-icon">{listing.item && <ItemIcon item={listing.item} />}</div>
            <div className={`mk-name ${tierOf(listing.item)}`}>{listing.itemName}</div>
            <div className="mk-price">
              {grouped(listing.price)} <Coin currency={listing.currency} />
            </div>
            <button
              className="mk-btn mk-walk"
              title={t('marketBoard.walkHint')}
              onClick={e => {
                e.stopPropagation();
                m.walk(i);
              }}
            >
              {t('marketBoard.walk')}
            </button>
          </div>
        ))}
        {page.listings.length === 0 && (
          <div className="mk-empty">
            <div>{t(m.searching ? 'marketBoard.searching' : 'marketBoard.empty')}</div>
            {!m.searching && <div className="mk-empty-hint">{t('marketBoard.emptyHint')}</div>}
          </div>
        )}
      </div>

      {m.board !== 0 && (
        <div className="mk-board" data-no-drag="true">
          <div className="mk-board-title">{t(m.board === 1 ? 'marketBoard.category' : 'marketBoard.pay')}</div>
          {m.board === 1 ? (
            <div className="mk-columns">
              {CATEGORY_COLUMNS.map(column => (
                <div key={column.title} className="mk-column">
                  <div className="mk-column-head">{t(column.title)}</div>
                  {column.entries.map(([value, key]) => (
                    <div
                      key={value}
                      className={`mk-entry${value === filter.category ? ' chosen' : ''}`}
                      onClick={() => m.pickCategory(value)}
                    >
                      {t(key)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="mk-pay">
              {[Currency.Any, ...CURRENCIES].map(c => (
                <div key={c} className={`mk-entry${c === filter.currency ? ' chosen' : ''}`} onClick={() => m.pickCurrency(c)}>
                  {currencyItem(c) && <Coin currency={c} />}
                  {label(currencyName(c))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mk-status">
        <span>{page.totalCount > 0 ? t('marketBoard.offerCount', { count: page.totalCount }) : ''}</span>
        <span className="mk-location">{location}</span>
      </div>
      <div className="mk-pager" data-no-drag="true">
        <button className="mk-btn" disabled={page.page <= 0} title={t('marketBoard.previousPage')} onClick={() => m.turnPage(-1)}>
          ◀
        </button>
        <span>{`${Math.min(page.page, pageCount - 1) + 1} / ${pageCount}`}</span>
        <button
          className="mk-btn"
          disabled={page.page + 1 >= page.pageCount}
          title={t('marketBoard.nextPage')}
          onClick={() => m.turnPage(1)}
        >
          ▶
        </button>
      </div>
      {m.refusal !== null && <div className="mk-message">{t(teleportText(m.refusal))}</div>}

      {hovered?.item && hover && <ItemTooltip item={hovered.item} x={hover.x} y={hover.y} context="plain" />}
    </div>
  );
});
