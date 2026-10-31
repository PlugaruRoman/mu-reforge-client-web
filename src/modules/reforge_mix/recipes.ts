import type { Item } from '@/ecs/world';
import { itemOptionTables, mixRecipes, type MixRecipe, type MixRateToken, type MixSource } from '@/controllers/assets';
import { t } from '@/i18n';
import { itemBaseName } from '@versions/shared/items/itemsDatabase';
import type { MixAdjuster, MixItem } from '../chaos_mix/mixRecipes';

/**
 * Port of our C++ client's GameLogic/Reforge/ReforgeMixRecipes.cpp: the Chaos Machine recipes our
 * server crafts that `Mix.bmd` never carried, the record no server crafting answers, and the mix
 * flags of our items. The server owns the validation (S Persistence/Initialization/VersionSeasonSix/
 * WingCraftMixes.cs, FlowerEvent.cs, ChaosMixes.cs); these only let the machine recognise a
 * combination, show its rate and price and send the right mix id. The server's own rate (C1 EC,
 * `reforge_hud`) replaces the shown one once it arrives.
 */

/** `MAX_ITEM_INDEX`: an item code is `group * 512 + number`. */
const code = (group: number, num: number) => group * 512 + num;

/** Mix ids: the server's crafting numbers. */
export const MIX = {
  fenrirUpgrade: 28,
  thirdWingsStage1: 38,
  thirdWingsStage2: 39,
  fourthWings: 40,
  gaionsOrder: 45,
  completeSecromicon: 46,
  unsupportedGoblinExchange: 47,
  whiteFlower: 100,
  redFlower: 101,
  yellowFlower: 102,
  lesserSpiritStone: 110,
  intermediateSpiritStone: 111,
  greaterSpiritStone: 112,
  garudasFeather: 113,
  lesserStoneCombine: 114,
  intermediateStoneCombine: 115,
} as const;

const FLOWERS = [120, 121, 122] as const;
const LUCKY_COIN = 123;
/** Suspicious Scrap of Paper: five stack into a Gaion's Order (our ReforgeMixRecipes.cpp, 2026-10-29). */
const SCRAP_OF_PAPER = 101;
const JEWEL_OF_CHAOS_ASSEMBLY = code(14, 157);
const SPIRIT_STONES = [164, 165, 166] as const;
const GARUDAS_FEATHER = 167;
const GARUDAS_FLAME = 168;
/** Our 4th wings (12/51-57) and the Olympiad Hero wings and capes. */
const OUR_WINGS: ReadonlySet<number> = new Set([51, 52, 53, 54, 55, 56, 57, 58, 59, 66, 67].map(n => code(12, n)));
/** `MIXTYPE_GOBLIN_ADD380`, the goblin's 380 option window (economy.ts `MIX_TYPE.option380`). */
const MIX_TYPE_ADD380 = 2;

/** `_MIXRATE_OPS`. */
const OP = { number: 0, add: 1, div: 4, maxRate: 32, excellent: 35, set: 37 } as const;
/** `RCP_SP_*`. */
const SP = { excellent: 1, add380: 2, set: 4 } as const;
const ANY = 255;
const CERTAIN = 100;
const GOLDEN_FENRIR_TEXT = 1871;

type Source = Partial<MixSource> & { typeMin: number; typeMax: number; count?: number };

function source({ count = 1, ...rest }: Source): MixSource {
  return {
    levelMin: 0,
    levelMax: ANY,
    optionMin: 0,
    optionMax: ANY,
    durabilityMin: 0,
    durabilityMax: ANY,
    special: 0,
    ...rest,
    countMin: count,
    countMax: count,
  };
}

const item = (group: number, num: number, count = 1) => source({ typeMin: code(group, num), typeMax: code(group, num), count });
const bundleOf30 = (num: number) => source({ typeMin: code(12, num), typeMax: code(12, num), levelMin: 2, levelMax: 2 });

/** `CreateRecipe`: the shown rate is the recipe's maximum; the Talisman of Luck counts on a mix that can fail. */
function recipe(mixId: number, successRate: number, zenType: 'A' | 'B', zen: number, sources: MixSource[]): MixRecipe {
  return {
    index: 0,
    mixId,
    names: [0, 0, 0],
    descriptions: [0, 0, 0],
    advice: [0, 0, 0],
    width: 1,
    height: 1,
    requiredLevel: 0,
    zenType,
    zen,
    rate: [{ op: OP.maxRate, value: 0 }],
    maxRate: successRate,
    mixOption: '',
    charmOption: successRate < CERTAIN ? 'A' : '',
    chaosCharmOption: '',
    sources,
  };
}

/** The four bundles of 30 jewels (soul, bless, chaos, creation) and a Greater Spirit Stone. */
const wingMaterials = () => [bundleOf30(31), bundleOf30(30), bundleOf30(141), bundleOf30(137), item(14, SPIRIT_STONES[2])];

/** "base + value / divisor", clamped to `maximum` (`SetValueDrivenRate`). */
const valueDrivenRate = (valueOp: number, divisor: number, base: number): MixRateToken[] => [
  { op: valueOp, value: 0 },
  { op: OP.div, value: 0 },
  { op: OP.number, value: divisor },
  { op: OP.add, value: 0 },
  { op: OP.number, value: base },
];

/** `AdjustRecipes` on the goblin's list. */
export function adjustGoblinRecipes(list: readonly MixRecipe[]): MixRecipe[] {
  const out: MixRecipe[] = list.filter(r => r.mixId !== MIX.unsupportedGoblinExchange);

  // The Flower Event: a full stack of one colour, always, for free.
  [10, 30, 50].forEach((amount, i) => out.push(recipe(MIX.whiteFlower + i, CERTAIN, 'A', 0, [item(14, FLOWERS[i], amount)])));

  // A wearable +11 item with the +16 option; the rarer records first, a plain one matches them too.
  for (const [mixId, rate, special] of [
    [MIX.greaterSpiritStone, 70, SP.set],
    [MIX.intermediateSpiritStone, 80, SP.excellent],
    [MIX.lesserSpiritStone, 90, 0],
  ] as const) {
    out.push(recipe(mixId, rate, 'A', 400_000, [source({ typeMin: code(0, 0), typeMax: code(11, 511), levelMin: 11, levelMax: 15, optionMin: 16, special })]));
  }

  // Three stones of a tier make one of the next.
  out.push(recipe(MIX.lesserStoneCombine, CERTAIN, 'A', 1_000_000, [item(14, SPIRIT_STONES[0], 3)]));
  out.push(recipe(MIX.intermediateStoneCombine, CERTAIN, 'A', 3_000_000, [item(14, SPIRIT_STONES[1], 3)]));

  // Garuda's Feather: a +13 third wing with an option, one record per block of third wings.
  for (const [from, to] of [[36, 40], [43, 43], [50, 50]]) {
    const wing = source({ typeMin: code(12, from), typeMax: code(12, to), levelMin: 13, levelMax: 15, optionMin: 4 });
    out.push(recipe(MIX.garudasFeather, 60, 'B', 220_000, [wing, ...wingMaterials()]));
  }

  // Garuda's Feather and Flame become a random 4th wing.
  out.push(recipe(MIX.fourthWings, 20, 'B', 800_000, [item(14, GARUDAS_FEATHER), item(14, GARUDAS_FLAME), ...wingMaterials()]));

  // Imperial Guardian entries, only where Mix.bmd has none.
  if (!out.some(r => r.mixId === MIX.gaionsOrder)) out.push(recipe(MIX.gaionsOrder, CERTAIN, 'A', 100_000, [item(14, 101, 5)]));
  if (!out.some(r => r.mixId === MIX.completeSecromicon)) {
    out.push(recipe(MIX.completeSecromicon, CERTAIN, 'A', 1_000_000, [103, 104, 105, 106, 107, 108].map(n => item(14, n))));
  }

  for (let i = 0; i < out.length; i++) {
    const r = out[i];
    // The third wings' rates are the server's (RebalanceWingCraftingLadder / TightenThirdWingSupply).
    if (r.mixId === MIX.thirdWingsStage1) out[i] = { ...r, rate: valueDrivenRate(OP.set, 60_000, 20), maxRate: 60 };
    if (r.mixId === MIX.thirdWingsStage2) out[i] = { ...r, rate: valueDrivenRate(OP.excellent, 500_000, 10), maxRate: 32 };
    // The server re-colours a Fenrir that already has a kind: the 'D' veto only kept it out.
    if (r.mixId === MIX.fenrirUpgrade && r.mixOption === 'D') out[i] = { ...out[i], mixOption: '' };
  }

  // The Golden Fenrir: the stock records with the fed item narrowed to an excellent +11 with an
  // option, in front of them (the first match wins), weapon record first.
  const firstFenrir = out.findIndex(r => r.mixId === MIX.fenrirUpgrade);
  if (firstFenrir >= 0) {
    const golden = out
      .filter(r => r.mixId === MIX.fenrirUpgrade && r.sources.length > 3)
      .map(r => ({
        ...r,
        names: [r.names[0], GOLDEN_FENRIR_TEXT, r.names[2]],
        sources: r.sources.map((s, j) => (j === 3 ? { ...s, levelMin: 11, optionMin: 4, special: s.special | SP.excellent } : s)),
      }));
    out.splice(firstFenrir, 0, ...golden);
  }

  return out.map((r, index) => (r.index === index ? r : { ...r, index }));
}

/** `CanReceiveGuardianOption`: the equipment `ItemAddOption.bmd` lists. */
function canReceiveGuardianOption(type: number): boolean {
  if (type >= code(12, 0)) return false;
  const options = itemOptionTables()?.addOptions[type];
  return !!options?.some(([option]) => option !== 0);
}

/** `AdjustMixItem`; `mixType` is the window's (`GetMixInventoryType`). */
export function adjustMixItem(mix: MixItem, item: Item, mixType = 0): void {
  // SetItem's socket XOR set the 380 flag on every socket item instead of clearing it. The socket sets take
  // the 380 option too, but a socketed piece carries the flag only in the 380 window: the +10..+15 upgrades
  // have a 380 bracket and a socket bracket under one mix number, and the flag would pick the 380 one there
  // (`MarkGuardianOptionItem`).
  mix.special &= ~SP.add380;
  const guardianWindow = mixType === MIX_TYPE_ADD380;
  if (((item.socketCount ?? 0) === 0 || guardianWindow) && canReceiveGuardianOption(mix.type)) mix.special |= SP.add380;
  if (mix.type === JEWEL_OF_CHAOS_ASSEMBLY) mix.chaosCharm = true;
  if (OUR_WINGS.has(mix.type)) mix.thirdWing = true;
  if (item.group === 14 && (FLOWERS.includes(item.num as 120) || item.num === LUCKY_COIN || item.num === SCRAP_OF_PAPER)) {
    mix.canStack = true;
    mix.count = mix.durability;
  }
}

/** The item each of our recipes makes (or takes), whose name the recipe shows. */
const NAMED_BY_ITEM: Readonly<Record<number, readonly [number, number]>> = {
  [MIX.whiteFlower]: [14, FLOWERS[0]],
  [MIX.redFlower]: [14, FLOWERS[1]],
  [MIX.yellowFlower]: [14, FLOWERS[2]],
  [MIX.lesserSpiritStone]: [14, SPIRIT_STONES[0]],
  [MIX.intermediateSpiritStone]: [14, SPIRIT_STONES[1]],
  [MIX.greaterSpiritStone]: [14, SPIRIT_STONES[2]],
  [MIX.lesserStoneCombine]: [14, SPIRIT_STONES[1]],
  [MIX.intermediateStoneCombine]: [14, SPIRIT_STONES[2]],
  [MIX.garudasFeather]: [14, GARUDAS_FEATHER],
  [MIX.gaionsOrder]: [14, 102],
  [MIX.completeSecromicon]: [14, 109],
};

/** `GetRecipeName` for our records: the item it makes (the flower it trades), the 4th wings by text. */
export function recipeName(r: MixRecipe): string | null {
  if (r.mixId === MIX.fourthWings) return t('reforgeMix.fourthWings');
  const named = NAMED_BY_ITEM[r.mixId];
  return named ? itemBaseName(named[0], named[1]) || null : null;
}

/** The goblin's list is type 0 (`MIXTYPE_GOBLIN_NORMAL`); every other type stays `Mix.bmd`'s. */
export const REFORGE_MIX: MixAdjuster = {
  recipes: list => (list === mixRecipes()?.[0] ? adjustGoblinRecipes(list) : list),
  item: adjustMixItem,
  name: recipeName,
};
