/**
 * The X-shop catalog: the categories, packages and product rows of one script year (`catalogData.ts`,
 * written by `catalogGenerate.ts`). Our server names the year in D2 0C (`CashShopCatalog.ScriptYearIdOf`:
 * 76 the original catalog, 77 Inferno's) and prices from the same files, so the window shows what the
 * server sells.
 */

type RawCategory = readonly [seq: number, name: string, parent: number, order: number, root: number];
type RawPackage = readonly [
  category: number,
  order: number,
  seq: number,
  name: string,
  price: number,
  description: string,
  cashName: string,
  productSeqs: readonly number[],
  itemCode: number,
  priceSeqs: readonly number[],
  cashType: number,
];
type RawProduct = readonly [
  priceSeq: number,
  productSeq: number,
  name: string,
  property: string,
  value: number,
  unit: string,
  price: number,
  itemCode: number,
];

export type RawCatalog = {
  categories: readonly RawCategory[];
  packages: readonly RawPackage[];
  products: readonly RawProduct[];
};

export type XShopCategory = { seq: number; name: string; parent: number; order: number };

export type XShopPackage = {
  category: number;
  order: number;
  seq: number;
  name: string;
  price: number;
  description: string;
  cashName: string;
  productSeqs: readonly number[];
  itemCode: number;
  priceSeqs: readonly number[];
  cashType: number;
};

export type XShopProduct = {
  priceSeq: number;
  productSeq: number;
  name: string;
  /** `Quantity`, `Duration` (value in seconds), `Rate` or empty. */
  property: string;
  value: number;
  unit: string;
  price: number;
  itemCode: number;
};

/** Which balance pays a price unit (GameShop/ReforgeShopRules.cpp `BalanceOfPriceUnit`). */
export type Balance = 'credit' | 'prepaid' | 'points' | 'total';

export function balanceOf(cashName: string): Balance {
  if (cashName.includes('(C)')) return 'credit';
  if (cashName.includes('(P)')) return 'prepaid';
  if (cashName.includes('Goblin') || cashName.includes('Point')) return 'points';
  return 'total';
}

/** An item code is `group * 512 + number` (S CashShopCatalog.cs `MaxItemIndex`). */
export const itemOfCode = (code: number) => ({ group: Math.floor(code / 512), num: code % 512 });

export class Catalog {
  /** The root categories (`Root == 1`): W Coin (C), W Coin (P), Goblin Point (InGameShopSystem.cpp `InitZoneInfo`). */
  readonly zones: XShopCategory[];
  private readonly children = new Map<number, XShopCategory[]>();
  private readonly packages = new Map<number, XShopPackage[]>();
  private readonly products = new Map<number, XShopProduct>();

  constructor(raw: RawCatalog) {
    const category = ([seq, name, parent, order]: RawCategory): XShopCategory => ({ seq, name, parent, order });
    this.zones = raw.categories.filter(c => c[4] === 1).map(category);
    for (const c of raw.categories) {
      if (c[4] === 1) continue;
      const list = this.children.get(c[2]) ?? [];
      list.push(category(c));
      this.children.set(c[2], list);
    }
    this.children.forEach(list => list.sort((a, b) => a.order - b.order));
    for (const p of raw.packages) {
      const [category, order, seq, name, price, description, cashName, productSeqs, itemCode, priceSeqs, cashType] = p;
      const list = this.packages.get(category) ?? [];
      list.push({ category, order, seq, name, price, description, cashName, productSeqs, itemCode, priceSeqs, cashType });
      this.packages.set(category, list);
    }
    this.packages.forEach(list => list.sort((a, b) => a.order - b.order));
    for (const [priceSeq, productSeq, name, property, value, unit, price, itemCode] of raw.products) {
      this.products.set(priceSeq, { priceSeq, productSeq, name, property, value, unit, price, itemCode });
    }
  }

  /** The tabs of a zone; a zone with none lists its own packages. */
  categoriesOf(zone: number): XShopCategory[] {
    return this.children.get(zone) ?? [];
  }

  packagesOf(category: number): XShopPackage[] {
    return this.packages.get(category) ?? [];
  }

  product(priceSeq: number): XShopProduct | undefined {
    return this.products.get(priceSeq);
  }

  /** The price tiers a buyer picks from (`MsgBoxIGSBuySelectItem`); none for a flat-priced package. */
  tiers(pkg: XShopPackage): XShopProduct[] {
    return pkg.priceSeqs.map(s => this.products.get(s)).filter((p): p is XShopProduct => !!p);
  }
}
