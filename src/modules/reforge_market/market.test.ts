import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { loadGameVersion } = await import('@/version');
await loadGameVersion('reforge');
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('../session');
const { installNet } = await import('./net');
const { ReforgeMarket, SEARCH_INTERVAL_MS, REFRESH_INTERVAL_MS } = await import('./state');
const { buildSearch, buildTeleport, parseSearchPage } = await import('./codec');
const { Quality, toggleTier } = await import('./rules');

installNet();

afterAll(() => loadGameVersion('season6'));

const ascii = (s: string, length: number) => {
  const out = new Array<number>(length).fill(0);
  [...new TextEncoder().encode(s)].slice(0, length - 1).forEach((b, i) => (out[i] = b));
  return out;
};
const u32 = (v: number) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];

/** One 83-byte listing as MarketViewPlugIn.ShowSearchResultAsync writes it. */
function listing(seller: string, slot: number, currency: number, price: number, item: number[], name: string, store: string): number[] {
  const room = new Array<number>(12).fill(0);
  item.forEach((b, i) => (room[i] = b));
  return [...ascii(seller, 10), 0, 135, 128, slot, currency, ...u32(price), ...room, ...ascii(name, 32), ...ascii(store, 20)];
}

/** [C2][size hi][size lo][E8][01][page][pageCount][total u16 LE][count] + listings. */
function searchResponse(page: number, pageCount: number, total: number, listings: number[][]): DataView {
  const size = 10 + listings.length * 83;
  const bytes = [0xc2, size >> 8, size & 0xff, 0xe8, 0x01, page, pageCount, total & 0xff, total >> 8, listings.length, ...listings.flat()];
  return new DataView(Uint8Array.from(bytes).buffer);
}

// Kris +7, durability 30, luck + skill: the 5-byte extended item (ItemSerializerExtended).
const KRIS = [0x00, 0x00, 0x07, 0x1e, 0x06];

describe('E8 01 MarketSearchResponse', () => {
  it('reads the page header and each 83-byte listing', () => {
    const page = parseSearchPage(
      searchResponse(1, 3, 25, [
        listing('Seller', 4, 0, 1_500_000, KRIS, 'Kris +7', 'Jewels'),
        listing('Друг', 9, 10, 20, [], 'Hidden', ''),
      ])
    );
    if (!page) throw new Error('search page not read');
    expect([page.page, page.pageCount, page.totalCount, page.listings.length]).toEqual([1, 3, 25, 2]);
    const [a, b] = page.listings;
    expect(a).toMatchObject({ sellerName: 'Seller', mapNumber: 0, x: 135, y: 128, storeSlot: 4, currency: 0, price: 1_500_000, itemName: 'Kris +7', storeName: 'Jewels' });
    expect(a.item).toMatchObject({ group: 0, num: 0, lvl: 7, luck: true, hasSkill: true });
    // The server cleared an item that did not fit: no item, the rest still read.
    expect(b.item).toBeUndefined();
    expect(b).toMatchObject({ sellerName: 'Друг', currency: 10, price: 20, itemName: 'Hidden', storeName: '' });
  });

  it('lands in the store and keeps the selected offer across a refresh', () => {
    EventBus.emit('MarketSearchResponse', searchResponse(0, 1, 2, [listing('A', 1, 0, 5, KRIS, 'x', ''), listing('B', 2, 0, 6, KRIS, 'y', '')]));
    ReforgeMarket.select(1);
    EventBus.emit('MarketSearchResponse', searchResponse(0, 1, 2, [listing('B', 2, 0, 6, KRIS, 'y', ''), listing('C', 3, 0, 7, KRIS, 'z', '')]));
    expect(ReforgeMarket.selected).toBe(0);
    expect(ReforgeMarket.searching).toBe(false);
  });
});

describe('requests', () => {
  it('builds E8 01 with the filter and the UTF-8 text cut to 16 bytes', () => {
    const bytes = new Uint8Array(
      buildSearch({ text: 'Blade of Kundun rare', currency: 0xff, category: 7, quality: 0x06, sortOrder: 1, page: 2 }).buffer
    );
    expect([...bytes.subarray(0, 9)]).toEqual([0xc1, 25, 0xe8, 0x01, 2, 0xff, 7, 0x06, 1]);
    expect(new TextDecoder().decode(bytes.subarray(9))).toBe('Blade of Kundun ');
    // A two-byte character is never split at the edge.
    const ru = new Uint8Array(buildSearch({ text: 'аааааааа' + 'б', currency: 0, category: 0, quality: 0, sortOrder: 0, page: 0 }).buffer);
    expect(new TextDecoder().decode(ru.subarray(9)).replace(/\0+$/, '')).toBe('аааааааа');
  });

  it('builds E8 04 with the seller name in 10 bytes', () => {
    expect([...new Uint8Array(buildTeleport('Seller').buffer)]).toEqual([0xc1, 14, 0xe8, 0x04, ...ascii('Seller', 10)]);
  });
});

describe('the board', () => {
  const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
  beforeEach(() => send.mockClear());

  it('E8 05 Result 0 opens the board and keeps the ceilings; the first page goes out on the tick', () => {
    EventBus.emit('MarketOpenResponse', new DataView(Uint8Array.from([0xc1, 17, 0xe8, 0x05, 0, ...u32(5000), ...u32(300), ...u32(50)]).buffer));
    expect(ReforgeMarket.isOpen).toBe(true);
    expect(ReforgeMarket.limits).toEqual({ wcoin: 5000, jewel: 300, zenBox: 50 });
    const now = Date.now() + REFRESH_INTERVAL_MS;
    ReforgeMarket.tick(now);
    expect(send).toHaveBeenCalledTimes(1);
    // A burst of filter clicks waits for the interval, then goes out once.
    ReforgeMarket.toggleSort(2);
    ReforgeMarket.pickCategory(5);
    ReforgeMarket.tick(now + 100);
    expect(send).toHaveBeenCalledTimes(1);
    ReforgeMarket.tick(now + SEARCH_INTERVAL_MS);
    expect(send).toHaveBeenCalledTimes(2);
    const sent = new Uint8Array(send.mock.calls[1][0].buffer);
    expect([sent[5], sent[6], sent[8]]).toEqual([0xff, 5, 2]);
  });

  it('E8 04 refusal stays as a line, success closes the board', () => {
    EventBus.emit('MarketTeleportResponse', new DataView(Uint8Array.from([0xc1, 5, 0xe8, 0x04, 5]).buffer));
    expect(ReforgeMarket.refusal).toBe(5);
    EventBus.emit('MarketTeleportResponse', new DataView(Uint8Array.from([0xc1, 5, 0xe8, 0x04, 0]).buffer));
    expect(ReforgeMarket.isOpen).toBe(false);
  });

  it('E8 05 Result 1 only updates the ceilings (the 13-byte form has no box ceiling)', () => {
    EventBus.emit('MarketOpenResponse', new DataView(Uint8Array.from([0xc1, 13, 0xe8, 0x05, 1, ...u32(7), ...u32(8)]).buffer));
    expect(ReforgeMarket.isOpen).toBe(false);
    expect(ReforgeMarket.limits).toEqual({ wcoin: 7, jewel: 8, zenBox: 0 });
  });

  it('E8 06 keeps the non-zen currency of each store slot', () => {
    EventBus.emit('MarketStoreCurrencies', new DataView(Uint8Array.from([0xc1, 9, 0xe8, 0x06, 2, 3, 1, 4, 0]).buffer));
    expect([...ReforgeMarket.storeCurrencies.entries()]).toEqual([[3, 1]]);
  });

  it('E8 03 answers with a line', () => {
    expect(() =>
      EventBus.emit('MarketPriceResponse', new DataView(Uint8Array.from([0xc1, 11, 0xe8, 0x03, 6, 2, 1, ...u32(9)]).buffer))
    ).not.toThrow();
  });
});

describe('tiers', () => {
  it('a mask holding every tier is no filter', () => {
    expect(toggleTier(0x0f, Quality.Guardian380)).toBe(Quality.Any);
    expect(toggleTier(Quality.Excellent, Quality.Excellent)).toBe(0);
  });
});

describe('names cut by the server', () => {
  it('drops a character the 10-byte field split', () => {
    const page = parseSearchPage(searchResponse(0, 1, 1, [listing('Другой', 1, 0, 1, KRIS, 'x', '')]));
    if (!page) throw new Error('search page not read');
    expect(page.listings[0].sellerName).toBe('Друг');
  });
});
