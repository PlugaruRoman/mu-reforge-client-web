import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('../session');
const { installNet } = await import('./net');
const { XShop } = await import('./state');
const { periodItemExpiry, periodItemLines, formatExpiry } = await import('./periodItems');
const { bagPriceRequest } = await import('./bagPrice');
const { Catalog, balanceOf, itemOfCode } = await import('./catalog');
const { CATALOGS } = await import('./catalogData');
const P = await import('@versions/reforge/packets/cashShop');

installNet();

const sent: number[][] = [];
vi.spyOn(Session, 'sendToGS').mockImplementation((b: DataView) => void sent.push([...new Uint8Array(b.buffer, b.byteOffset, b.byteLength)]));
beforeEach(() => (sent.length = 0));

/** `[C1][len][D2][sub]` then `body` (S CashShopViewPlugIn.cs / PeriodItemViewPlugIn.cs write these by hand). */
function frame(sub: number, length: number, body: (v: DataView) => void): DataView {
  const v = new DataView(new ArrayBuffer(length));
  v.setUint8(0, 0xc1);
  v.setUint8(1, length);
  v.setUint8(2, 0xd2);
  v.setUint8(3, sub);
  body(v);
  return v;
}

describe('cash shop frames (C1 D2)', () => {
  it('lists every frame at the length the server writes', () => {
    const at = (sub: number) => {
      const frame = P.CASH_SHOP_PACKETS.find(p => p.SubCode === sub);
      if (!frame) throw new Error(`no cash shop frame ${sub}`);
      return frame;
    };
    expect([0x01, 0x02, 0x03, 0x06, 0x0b, 0x0c, 0x0d, 0x11, 0x12, 0x15, 0x60].map(s => at(s).Length)).toEqual([
      45, 5, 9, 12, 5, 10, 33, 5, 12, 10, 9,
    ]);
  });

  it('D2 01: the five doubles after the view type', () => {
    EventBus.emit(
      'CashShopPoints',
      frame(0x01, 45, v => {
        v.setFloat64(5, 1500, true);
        v.setFloat64(13, 1000, true);
        v.setFloat64(21, 500, true);
        v.setFloat64(29, 77, true);
      })
    );
    expect(XShop.points).toEqual({ total: 1500, credit: 1000, prepaid: 500, goblin: 77 });
  });

  it('D2 02: an open answer opens the window and asks for the balance and storage page 1', () => {
    XShop.toggle();
    expect(sent[0]).toEqual([0xc1, 5, 0xd2, 0x02, 0]);
    EventBus.emit('CashShopOpenResult', frame(0x02, 5, v => v.setUint8(4, 1)));
    expect(XShop.open).toBe(true);
    expect(sent[1]).toEqual([0xc1, 4, 0xd2, 0x01]);
    // D2 05: page 1 (u32 LE at 4), box 'S' at 8.
    expect(sent[2]).toEqual([0xc1, 10, 0xd2, 0x05, 1, 0, 0, 0, 0x53, 0]);
    XShop.close();
    expect(sent[3]).toEqual([0xc1, 5, 0xd2, 0x02, 1]);
  });

  it('D2 06 + D2 0D: the storage page and its lines', () => {
    EventBus.emit(
      'CashShopStorageCount',
      frame(0x06, 12, v => {
        v.setUint16(4, 21, true);
        v.setUint16(6, 1, true);
        v.setUint16(8, 2, true);
        v.setUint16(10, 2, true);
      })
    );
    EventBus.emit(
      'CashShopStorageItem',
      frame(0x0d, 33, v => {
        v.setInt32(4, 7, true);
        v.setInt32(8, 7, true);
        v.setInt32(16, 281, true);
        v.setInt32(20, 349, true);
        v.setFloat64(24, 100, true);
        v.setUint8(32, 0x50);
      })
    );
    expect([XShop.storageTotal, XShop.storagePage, XShop.storagePages]).toEqual([21, 2, 2]);
    expect(XShop.storage).toEqual([{ storageIndex: 7, itemSeq: 7, productSeq: 281, priceSeq: 349, cash: 100, type: 0x50 }]);
  });

  it('D2 0B request: storage index, item seq, item code, type P', () => {
    XShop.useStorageItem({ storageIndex: 7, itemSeq: 9, productSeq: 0, priceSeq: 0, cash: 0, type: 0x50 });
    expect(sent[0]).toEqual([0xc1, 15, 0xd2, 0x0b, 7, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0x50]);
    expect(sent[1]).toEqual([0xc1, 4, 0xd2, 0x01]);
  });

  it('D2 0B answer: success shows the storage again', () => {
    EventBus.emit('CashShopStorageUseResult', frame(0x0b, 5, v => v.setUint8(4, 0)));
    expect(XShop.message?.good).toBe(true);
    expect(sent[0]?.slice(0, 4)).toEqual([0xc1, 10, 0xd2, 0x05]);
  });

  it('D2 03 request and answer', () => {
    const pkg = { category: 22, order: 1, seq: 90, name: 'x', price: 100, description: '', cashName: 'W Coin(C)', productSeqs: [26], itemCode: 7241, priceSeqs: [43], cashType: 508 };
    XShop.buy(pkg, { priceSeq: 43, productSeq: 26, name: 'x', property: 'Duration', value: 2592000, unit: 'Sec.', price: 100, itemCode: 7241 });
    // package 90, category 22, price seq 43, item 7241 (u16), coin 508, mileage 0 (CashShopItemBuyRequest, 23 bytes).
    expect(sent[0]).toEqual([0xc1, 23, 0xd2, 0x03, 90, 0, 0, 0, 22, 0, 0, 0, 43, 0, 0, 0, 0x49, 0x1c, 0xfc, 1, 0, 0, 0]);
    sent.length = 0;
    EventBus.emit('CashShopBuyResult', frame(0x03, 9, v => v.setUint8(4, 1)));
    expect(XShop.message?.good).toBe(false);
    expect(sent).toEqual([]);
  });

  it('D2 0C picks the catalog year', () => {
    EventBus.emit(
      'CashShopScriptVersion',
      frame(0x0c, 10, v => {
        v.setUint16(4, 512, true);
        v.setUint16(6, 2012, true);
        v.setUint16(8, 77, true);
      })
    );
    expect(XShop.scriptYear).toBe(77);
  });

  it('D2 60: the bag price and its currency; the request is C1 04 D2 60', () => {
    EventBus.emit(
      'InventoryExtensionPrice',
      frame(0x60, 9, v => {
        v.setUint32(4, 300, true);
        v.setUint8(8, 1);
      })
    );
    expect(XShop.bagPrice).toEqual({ price: 300, currency: 1 });
    expect([...bagPriceRequest()]).toEqual([0xc1, 0x04, 0xd2, 0x60]);
  });
});

describe('rental items (D2 11 / D2 12)', () => {
  const rental = (slot: number, code: number, expires: number) =>
    frame(0x12, 12, v => {
      v.setUint16(4, code, true);
      v.setUint16(6, slot, true);
      v.setInt32(8, expires, true);
    });
  const ring = { group: 13, num: 10 }; // 13 * 512 + 10 = 6666
  const future = Math.floor(Date.now() / 1000) + 86400;

  it('keeps the expiry by slot while the code matches the item there', () => {
    EventBus.emit('PeriodItemCount', frame(0x11, 5, v => v.setUint8(4, 1)));
    EventBus.emit('PeriodItem', rental(20, 6666, future));
    expect(periodItemExpiry(20, ring)?.getTime()).toBe(future * 1000);
    expect(periodItemExpiry(20, { group: 13, num: 11 })).toBeNull();
    expect(periodItemLines(20, ring).map(l => l.color)).toEqual(['orange', 'blue']);
  });

  it('a new count clears the old list', () => {
    EventBus.emit('PeriodItemCount', frame(0x11, 5, v => v.setUint8(4, 0)));
    expect(periodItemExpiry(20, ring)).toBeNull();
  });

  it('an expired rental says so', () => {
    EventBus.emit('PeriodItem', rental(21, 6666, 1000));
    expect(periodItemLines(21, ring).map(l => l.color)).toEqual(['red']);
  });

  it('prints the date as our client does', () => {
    expect(formatExpiry(new Date(2026, 9, 5, 7, 3))).toBe('2026-10-05  07:03');
  });
});

describe('catalog', () => {
  const catalog = new Catalog(CATALOGS[76]);

  it('has the three zones and their tabs', () => {
    expect(catalog.zones.map(z => z.name)).toEqual(['W Coin (C)', 'W Coin (P)', 'Goblin Point']);
    expect(catalog.categoriesOf(10).map(c => c.name)).toContain('Buff');
  });

  it('reads the Magic Backpack package and its tier', () => {
    const backpack = catalog.packagesOf(13).find(p => p.seq === 260);
    if (!backpack) throw new Error('no Magic Backpack package');
    expect([backpack.name, backpack.price, backpack.itemCode]).toEqual(['Magic Backpack', 100, 7330]);
    expect(itemOfCode(backpack.itemCode)).toEqual({ group: 14, num: 162 });
    expect(catalog.tiers(backpack).map(t => t.priceSeq)).toEqual([349]);
  });

  it('knows which balance pays a unit', () => {
    expect(['W Coin(C)', 'W Coin(P)', 'Goblin Point', '?'].map(balanceOf)).toEqual(['credit', 'prepaid', 'points', 'total']);
  });
});
