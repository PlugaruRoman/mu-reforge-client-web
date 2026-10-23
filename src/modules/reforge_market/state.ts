import { makeAutoObservable, observable, runInAction } from 'mobx';
import { MuWindows } from '@/controllers/interface/windowManager';
import { playUiSound } from '@/controllers/sound';
import { Session } from '../session';
import { buildSearch, buildTeleport, type PriceLimits, type SearchFilter, type SearchPage } from './codec';
import { Category, Currency, LAST_CATEGORY, Quality, SortOrder, TeleportResult, clampPage, isCurrency, toggleTier } from './rules';

/** The window's id (`versions/shared/ui/windows/reforge_market/window.ts`). */
export const MARKET_WINDOW = 'reforge_market';

/**
 * The server answers no search sooner than 500 ms after the last one (S MarketConfiguration
 * SearchIntervalMilliseconds), so a burst of filter clicks goes out as one search a little later;
 * an open board looks again every 8 s, and a refusal line stays 6 s (MarketWindow.cpp).
 */
export const SEARCH_INTERVAL_MS = 600;
export const REFRESH_INTERVAL_MS = 8000;
export const MESSAGE_MS = 6000;
const TICK_MS = 100;

/** The category board (0), the currency board (1 = category, 2 = currency). */
export type Board = 0 | 1 | 2;

const defaultFilter = (): SearchFilter => ({
  text: '',
  currency: Currency.Any,
  category: Category.Any,
  quality: Quality.Any,
  sortOrder: SortOrder.PriceAscending,
  page: 0,
});

const EMPTY_PAGE: SearchPage = { page: 0, pageCount: 0, totalCount: 0, listings: [] };

/**
 * `CMarketWindow` (UI/Market/MarketWindow.cpp) without its drawing: the filter, the page the server
 * sent, the selected offer and the pacing of the searches. Nothing is bought here: a purchase happens
 * in the seller's own store window, the board only finds offers and walks the hero there (E8 04).
 */
export const ReforgeMarket = new (class {
  filter: SearchFilter = defaultFilter();
  /** What the search field holds; it becomes `filter.text` on the next search. */
  draft = '';
  page: SearchPage = EMPTY_PAGE;
  selected = -1;
  searching = false;
  board: Board = 0;
  /** A refusal for the answer line: the teleport result code, or null. */
  refusal: number | null = null;
  limits: PriceLimits = { wcoin: 0, jewel: 0, zenBox: 0 };
  /** E8 06: what each slot of the store last looked at is priced in (zen when absent). */
  storeCurrencies = observable.map<number, number>();

  private pending = false;
  private lastSent = 0;
  private refusalAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    makeAutoObservable<this, 'pending' | 'lastSent' | 'refusalAt' | 'timer'>(this, {
      pending: false,
      lastSent: false,
      refusalAt: false,
      timer: false,
      storeCurrencies: false,
    });
  }

  get isOpen(): boolean {
    return MuWindows.isOpen(MARKET_WINDOW);
  }

  /** E8 05 with Result 0, or the player's own request: show the board and ask for its page. */
  open(): void {
    const opening = !this.isOpen;
    MuWindows.setOpen(MARKET_WINDOW, true);
    if (!opening) return;
    this.refusal = null;
    this.board = 0;
    this.requestSearch(this.filter.page);
    this.timer ??= setInterval(() => this.tick(Date.now()), TICK_MS);
  }

  close(): void {
    MuWindows.setOpen(MARKET_WINDOW, false);
    this.board = 0;
    this.pending = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Ask for `page` with the current filter and the typed text, at the next allowed moment. */
  requestSearch(page: number): void {
    this.filter = { ...this.filter, text: this.draft, page: Math.max(0, page) };
    this.pending = true;
    this.searching = true;
  }

  /** Sends a pending search when the interval allows; an open board repeats the last one now and then. */
  tick(now: number): void {
    if (!this.pending && now - this.lastSent >= REFRESH_INTERVAL_MS) this.pending = true;
    if (this.refusal !== null && now - this.refusalAt >= MESSAGE_MS) this.refusal = null;
    if (!this.pending || now - this.lastSent < SEARCH_INTERVAL_MS) return;
    this.pending = false;
    this.lastSent = now;
    Session.sendToGS(buildSearch(this.filter));
  }

  /** E8 01: the page arrived. The selected offer survives while the same seller's slot is on it. */
  searchArrived(page: SearchPage): void {
    const was = this.page.listings[this.selected];
    this.selected = was ? page.listings.findIndex(l => l.sellerName === was.sellerName && l.storeSlot === was.storeSlot) : -1;
    this.page = page;
    this.filter = { ...this.filter, page: page.page };
    this.searching = false;
  }

  setDraft(text: string): void {
    this.draft = text;
  }

  resetFilters(): void {
    playUiSound('click');
    this.filter = defaultFilter();
    this.draft = '';
    this.board = 0;
    this.requestSearch(0);
  }

  /** A second click on the open board closes it. */
  toggleBoard(board: Board): void {
    this.board = this.board === board ? 0 : board;
  }

  pickCategory(category: number): void {
    if (category < 0 || category > LAST_CATEGORY) return;
    playUiSound('click');
    this.filter = { ...this.filter, category };
    this.board = 0;
    this.requestSearch(0);
  }

  pickCurrency(currency: number): void {
    if (currency !== Currency.Any && !isCurrency(currency)) return;
    playUiSound('click');
    this.filter = { ...this.filter, currency };
    this.board = 0;
    this.requestSearch(0);
  }

  /** Each sort button switches its order on; a second click goes back to the server's order by name. */
  toggleSort(order: number): void {
    if (order !== SortOrder.PriceAscending && order !== SortOrder.PriceDescending) return;
    playUiSound('click');
    this.filter = { ...this.filter, sortOrder: this.filter.sortOrder === order ? SortOrder.Name : order };
    this.requestSearch(0);
  }

  /** The "All" chip (0) clears the mask; a tier chip switches its tier. */
  toggleTier(tier: number): void {
    playUiSound('click');
    this.filter = { ...this.filter, quality: tier === Quality.Any ? Quality.Any : toggleTier(this.filter.quality, tier) };
    this.requestSearch(0);
  }

  turnPage(delta: -1 | 1): void {
    const page = clampPage(this.page.page + delta, this.page.pageCount);
    if (page === this.page.page) return;
    playUiSound('click');
    this.requestSearch(page);
  }

  select(index: number): void {
    if (index >= 0 && index < this.page.listings.length) this.selected = index;
  }

  /** E8 04: walk to the seller of offer `index`. */
  walk(index: number): void {
    const listing = this.page.listings[index];
    if (!listing) return;
    playUiSound('click');
    Session.sendToGS(buildTeleport(listing.sellerName));
  }

  /** E8 04 answer: on success the hero arrives beside the store and the board closes. */
  teleportAnswered(result: number): void {
    if (result === TeleportResult.Success) {
      this.close();
      return;
    }
    this.refusal = result;
    this.refusalAt = Date.now();
    playUiSound('error');
  }

  setLimits(limits: PriceLimits): void {
    this.limits = limits;
  }

  setStoreCurrencies(pairs: { slot: number; currency: number }[]): void {
    runInAction(() => {
      this.storeCurrencies.clear();
      for (const { slot, currency } of pairs) if (currency !== Currency.Zen) this.storeCurrencies.set(slot, currency);
    });
  }
})();
