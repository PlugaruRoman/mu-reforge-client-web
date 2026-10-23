import type { TextKey } from '@/i18n';
import { Category, Currency, Quality, TeleportResult, isJewel, isZenBox } from '@/modules/reforge_market';

/** The panel (our client's reforge_market.rcss draws it at about this size). */
export const WIDTH = 420;
export const HEIGHT = 360;

/** The category board in three columns, as our client groups it (UI/Market/MarketText.cpp `Board`). */
export const CATEGORY_COLUMNS: readonly { title: TextKey; entries: readonly [number, TextKey][] }[] = [
  {
    title: 'marketBoard.columnWeapons',
    entries: [
      [Category.Weapons, 'marketBoard.catAllWeapons'],
      [Category.Swords, 'marketBoard.catSwords'],
      [Category.AxesAndMaces, 'marketBoard.catAxesMaces'],
      [Category.Spears, 'marketBoard.catSpears'],
      [Category.Bows, 'marketBoard.catBows'],
      [Category.Staffs, 'marketBoard.catStaffs'],
    ],
  },
  {
    title: 'marketBoard.columnWorn',
    entries: [
      [Category.Armor, 'marketBoard.catAllArmor'],
      [Category.Helms, 'marketBoard.catHelms'],
      [Category.Armors, 'marketBoard.catArmors'],
      [Category.Pants, 'marketBoard.catPants'],
      [Category.Gloves, 'marketBoard.catGloves'],
      [Category.Boots, 'marketBoard.catBoots'],
      [Category.Shields, 'marketBoard.catShields'],
    ],
  },
  {
    title: 'marketBoard.columnOther',
    entries: [
      [Category.Any, 'marketBoard.catEverything'],
      [Category.Wings, 'marketBoard.catWingsOrbs'],
      [Category.PetsAndRings, 'marketBoard.catPetsRings'],
      [Category.Jewels, 'marketBoard.catJewels'],
      [Category.Scrolls, 'marketBoard.catScrolls'],
      [Category.Misc, 'marketBoard.catMisc'],
    ],
  },
];

export function categoryName(category: number): TextKey {
  for (const column of CATEGORY_COLUMNS) for (const [value, key] of column.entries) if (value === category) return key;
  return 'marketBoard.catEverything';
}

const JEWELS: readonly TextKey[] = [
  'marketBoard.jewelBless', 'marketBoard.jewelSoul', 'marketBoard.jewelLife', 'marketBoard.jewelCreation',
  'marketBoard.jewelGuardian', 'marketBoard.jewelGemstone', 'marketBoard.jewelHarmony', 'marketBoard.jewelChaos',
  'marketBoard.jewelLowerRefine', 'marketBoard.jewelHigherRefine', 'marketBoard.jewelSkill', 'marketBoard.jewelLuck',
  'marketBoard.jewelSea', 'marketBoard.jewelChaosAssembly',
];
const BOXES: readonly TextKey[] = [
  'marketBoard.box100kk', 'marketBoard.box200kk', 'marketBoard.box500kk',
  'marketBoard.box700kk', 'marketBoard.box1000kk', 'marketBoard.box2000kk',
];

/** MarketText.cpp CurrencyShortName. */
export function currencyName(currency: number): TextKey | null {
  if (currency === Currency.Any) return 'marketBoard.anyPayment';
  if (currency === Currency.Zen) return 'marketBoard.zen';
  if (currency === Currency.WCoin) return 'marketBoard.wcoin';
  if (isJewel(currency)) return JEWELS[currency - Currency.FirstJewel];
  if (isZenBox(currency)) return BOXES[currency - Currency.FirstZenBox];
  return null;
}

export const TIER_NAMES: Readonly<Record<number, TextKey>> = {
  [Quality.Any]: 'marketBoard.qualityAll',
  [Quality.Simple]: 'marketBoard.qualitySimple',
  [Quality.Excellent]: 'marketBoard.qualityExcellent',
  [Quality.Ancient]: 'marketBoard.qualityAncient',
  [Quality.Socket]: 'marketBoard.qualitySocket',
  [Quality.Guardian380]: 'marketBoard.quality380',
};

export const TIER_CLASS: Readonly<Record<number, string>> = {
  [Quality.Excellent]: 'exc',
  [Quality.Ancient]: 'anc',
  [Quality.Socket]: 'socket',
  [Quality.Guardian380]: 'g380',
};

/** MarketText.cpp TeleportResultText. */
export function teleportText(result: number): TextKey {
  switch (result) {
    case TeleportResult.MarketDisabled:
      return 'marketBoard.closed';
    case TeleportResult.TeleportDisabled:
      return 'marketBoard.teleportOff';
    case TeleportResult.SellerNotFound:
      return 'marketBoard.sellerGone';
    case TeleportResult.NotInSafezone:
      return 'marketBoard.onlyFromTown';
    case TeleportResult.StoreNotInSafezone:
      return 'marketBoard.storeNotInTown';
    case TeleportResult.InvalidState:
      return 'marketBoard.notPossible';
    case TeleportResult.MapNotAllowed:
      return 'marketBoard.mapNotAllowed';
    default:
      return 'marketBoard.cannotGo';
  }
}
