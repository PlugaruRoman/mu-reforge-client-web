/**
 * The market board's values, byte for byte the server's enums (S GameLogic/Market/*.cs, DataModel
 * StoreCurrencyType) as our client mirrors them (GameLogic/Reforge/ReforgeMarket.h,
 * ReforgeStoreCurrency.h). They travel in E8 01 / 03 / 04.
 */

/** S MarketCategory. */
export const Category = {
  Any: 0,
  Weapons: 1,
  Shields: 2,
  Armor: 3,
  WingsAndPets: 4,
  Jewels: 5,
  Misc: 6,
  Swords: 7,
  AxesAndMaces: 8,
  Spears: 9,
  Bows: 10,
  Staffs: 11,
  Helms: 12,
  Armors: 13,
  Pants: 14,
  Gloves: 15,
  Boots: 16,
  Wings: 17,
  PetsAndRings: 18,
  Scrolls: 19,
} as const;
export const LAST_CATEGORY = Category.Scrolls;

/** S MarketQuality: a mask; 0 matches every item. */
export const Quality = { Any: 0, Simple: 0x01, Excellent: 0x02, Ancient: 0x04, Socket: 0x08, Guardian380: 0x10 } as const;
export const QUALITY_ALL = 0x1f;
/** The tier chips in the order the window shows them (MarketWindow.cpp SyncFilters). */
export const TIERS: readonly number[] = [Quality.Simple, Quality.Excellent, Quality.Ancient, Quality.Socket, Quality.Guardian380];

/** S MarketSortOrder. */
export const SortOrder = { Name: 0, PriceAscending: 1, PriceDescending: 2 } as const;

/** S MarketTeleportResult (E8 04). */
export const TeleportResult = {
  Success: 0,
  Failed: 1,
  MarketDisabled: 2,
  TeleportDisabled: 3,
  SellerNotFound: 4,
  NotInSafezone: 5,
  StoreNotInSafezone: 6,
  InvalidState: 7,
  MapNotAllowed: 8,
} as const;

/** S MarketPriceResult (E8 03). */
export const PriceResult = {
  Success: 0,
  Failed: 1,
  MarketDisabled: 2,
  ItemNotFound: 3,
  StoreOpen: 4,
  PriceInvalid: 5,
  PriceTooHigh: 6,
  CurrencyInvalid: 7,
  LevelTooLow: 8,
  ItemNotTradeable: 9,
} as const;

/** DataModel StoreCurrencyType: zen, W Coin, 14 bank jewels (10 + JewelBankItemType), 6 Boxes of Zen. */
export const Currency = { Zen: 0, WCoin: 1, FirstJewel: 10, LastJewel: 23, FirstZenBox: 24, LastZenBox: 29, Any: 0xff } as const;
export const isJewel = (c: number) => c >= Currency.FirstJewel && c <= Currency.LastJewel;
export const isZenBox = (c: number) => c >= Currency.FirstZenBox && c <= Currency.LastZenBox;
export const isCurrency = (c: number) => c === Currency.Zen || c === Currency.WCoin || isJewel(c) || isZenBox(c);
/** Every currency in palette order (ReforgeStoreCurrency.h `All`). */
export const CURRENCIES: readonly number[] = [0, 1, ...Array.from({ length: 20 }, (_, i) => 10 + i)];

/**
 * The item a jewel or box price is paid with, `[group, number]` (ReforgeJewelBank.cpp `Jewels`,
 * ReforgeItemTypes.h; S JewelBankItemTypeExtensions.ItemIds). Undefined for zen and W Coin.
 */
const JEWEL_ITEMS: readonly [number, number][] = [
  [14, 13], [14, 14], [14, 16], [14, 22], [14, 31], [14, 41], [14, 42],
  [12, 15], [14, 43], [14, 44], [14, 124], [14, 125], [14, 176], [14, 157],
];
export function currencyItem(c: number): [number, number] | undefined {
  if (isJewel(c)) return JEWEL_ITEMS[c - Currency.FirstJewel];
  if (isZenBox(c)) return [14, 170 + c - Currency.FirstZenBox];
  return undefined;
}

/** The page within 0 .. pageCount - 1 (ReforgeMarket.cpp ClampPage). */
export function clampPage(page: number, pageCount: number): number {
  return Math.max(0, Math.min(page, Math.max(1, pageCount) - 1));
}

/** Toggles one tier; a mask holding every tier is no filter (ReforgeMarket.cpp ToggleTier). */
export function toggleTier(mask: number, tier: number): number {
  const next = mask ^ tier;
  return next === QUALITY_ALL ? Quality.Any : next;
}
