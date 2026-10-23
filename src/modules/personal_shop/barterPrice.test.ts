import { describe, expect, it, vi } from 'vitest';
import type { Item } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { readShopEntry } = await import('./net');

const ITEM = { group: 0, num: 1, lvl: 0 } as Item;

/** One `PlayerShopItemExtended` head (S xml): MoneyPrice u32 LE, PriceItemType u16 LE, RequiredItemAmount u16 LE, slot. */
function head(money: number, type: number, amount: number, slot: number): DataView {
  const b = new DataView(new ArrayBuffer(9));
  b.setUint32(0, money, true);
  b.setUint16(4, type, true);
  b.setUint16(6, amount, true);
  b.setUint8(8, slot);
  return b;
}

describe('a personal shop price at 106.3', () => {
  it('is zen when no item amount is asked', () => {
    // What ShowShopItemListExtendedPlugIn.cs writes today: MoneyPrice only.
    expect(readShopEntry(head(1_500_000, 0, 0, 204), 0, ITEM)).toEqual({ slot: 204, item: ITEM, price: 1_500_000 });
  });

  it('is a barter when an amount is set: amount pieces of group << 12 | number', () => {
    // 3 Jewels of Bless (14/13); client PersonalShopCurrency.cpp DecodeExtendedPrice.
    const entry = readShopEntry(head(0, (14 << 12) | 13, 3, 205), 0, ITEM);
    expect(entry.barter).toEqual({ itemType: (14 << 12) | 13, amount: 3 });
  });
});
