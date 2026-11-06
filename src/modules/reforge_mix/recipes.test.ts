import { existsSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Item } from '@/ecs/world';
import type { MixRecipe, MixSource } from '@/controllers/assets';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { checkMix, setMixAdjuster } = await import('../chaos_mix/mixRecipes');
const { ANCIENT_SMITH, ANCIENT_SOUL_STONE, MIX, REFORGE_MIX, adjustGoblinRecipes, adjustMixItem, ancientSmithRecipes, recipeName } = await import('./recipes');
const { ancientSoulStoneLines } = await import('./stone');
const { loadItemOptionTables } = await import('@/controllers/assets');

const code = (group: number, num: number) => group * 512 + num;
const src = (typeMin: number, typeMax = typeMin): MixSource => ({
  typeMin, typeMax, levelMin: 0, levelMax: 255, optionMin: 0, optionMax: 255, durabilityMin: 0, durabilityMax: 255, countMin: 1, countMax: 1, special: 0,
});
const stock = (mixId: number, sources: MixSource[], mixOption = ''): MixRecipe => ({
  index: 0, mixId, names: [100, 0, 0], descriptions: [0, 0, 0], advice: [0, 0, 0], width: 1, height: 1, requiredLevel: 0,
  zenType: 'A', zen: 1000, rate: [{ op: 32, value: 0 }], maxRate: 50, mixOption, charmOption: 'A', chaosCharmOption: '', sources,
});

/** A Mix.bmd-like goblin list: the Fenrir upgrade (horn, life, chaos, weapon), mix 47 and a third wing record. */
const LIST: MixRecipe[] = [
  stock(MIX.fenrirUpgrade, [src(code(13, 37)), src(code(14, 16)), src(code(12, 15)), src(code(0, 0), code(5, 511))], 'D'),
  stock(MIX.unsupportedGoblinExchange, [src(code(14, 112)), src(code(14, 122))]),
  stock(MIX.thirdWingsStage1, [src(code(12, 3))]),
];
const ADJUSTED = adjustGoblinRecipes(LIST);
const mixIds = ADJUSTED.map(r => r.mixId);
const it14 = (num: number, durability = 1, lvl = 0) => ({ group: 14, num, durability, lvl }) as Item;
const bundle = (num: number) => ({ group: 12, num, lvl: 2, durability: 1 }) as Item;

beforeAll(() => setMixAdjuster({ recipes: l => l, item: adjustMixItem, name: recipeName }));
afterAll(() => setMixAdjuster(null));

describe('our goblin recipes (ReforgeMixRecipes.cpp AdjustRecipes)', () => {
  it('drops mix 47, adds ours, numbers every record by its place', () => {
    expect(mixIds).not.toContain(MIX.unsupportedGoblinExchange);
    for (const id of [40, 45, 46, 100, 101, 102, 110, 111, 112, 113, 114, 115]) expect(mixIds).toContain(id);
    expect(mixIds.filter(id => id === MIX.garudasFeather)).toHaveLength(3);
    expect(ADJUSTED.every((r, i) => r.index === i)).toBe(true);
  });

  it('puts the Golden Fenrir in front of the stock record and lifts the D veto', () => {
    const [gold, black] = ADJUSTED;
    expect([gold.mixId, black.mixId]).toEqual([28, 28]);
    expect(gold.names[1]).toBe(1871);
    expect(gold.sources[3]).toMatchObject({ levelMin: 11, optionMin: 4, special: 1 });
    expect(black.mixOption).toBe('');
  });

  it('sets the third wing stage 1 rate to the server\'s', () => {
    const r = ADJUSTED.find(x => x.mixId === MIX.thirdWingsStage1);
    expect(r?.maxRate).toBe(60);
    expect(r?.rate.map(t => t.op)).toEqual([37, 4, 0, 1, 0]);
  });

  it('matches 30 red flowers: certain and free', () => {
    const check = checkMix(ADJUSTED, [it14(121, 20), it14(121, 10)]);
    expect(check.recipe?.mixId).toBe(MIX.redFlower);
    expect([check.successRate, check.requiredZen]).toEqual([100, 0]);
    expect(checkMix(ADJUSTED, [it14(121, 20)]).recipe).toBeNull();
  });

  it('picks the spirit stone by the item rarity', () => {
    const sword = { group: 0, num: 5, lvl: 11, optionLevel: 4, durability: 30 } as Item;
    expect(checkMix(ADJUSTED, [sword]).recipe?.mixId).toBe(MIX.lesserSpiritStone);
    const excellent = checkMix(ADJUSTED, [{ ...sword, isExcellent: true, excellentFlags: 1 }]);
    expect(excellent.recipe?.mixId).toBe(MIX.intermediateSpiritStone);
    expect([excellent.successRate, excellent.requiredZen]).toEqual([80, 400_000]);
    expect(checkMix(ADJUSTED, [{ ...sword, optionLevel: 3 }]).recipe).toBeNull();
  });

  it('combines three stones and makes the 4th wings at 20 % for 800,000 a percent', () => {
    expect(checkMix(ADJUSTED, [it14(164), it14(164), it14(164)]).recipe?.mixId).toBe(MIX.lesserStoneCombine);
    const wings = checkMix(ADJUSTED, [it14(167), it14(168), bundle(31), bundle(30), bundle(141), bundle(137), it14(166)]);
    expect(wings.recipe?.mixId).toBe(MIX.fourthWings);
    expect([wings.successRate, wings.requiredZen]).toEqual([20, 16_000_000]);
    expect(wings.recipe && recipeName(wings.recipe)).toBe('4th Level Wings');
  });

  it('marks our items: the Chaos Assembly is a chaos charm, our wings third wings', () => {
    const mix = { type: code(14, 157), special: 2, chaosCharm: false, thirdWing: false, canStack: false, count: 1, durability: 1 } as Parameters<typeof adjustMixItem>[0];
    adjustMixItem(mix, it14(157));
    expect(mix).toMatchObject({ chaosCharm: true, special: 0 });
    const wing = { ...mix, type: code(12, 52), chaosCharm: false };
    adjustMixItem(wing, { group: 12, num: 52 } as Item);
    expect(wing.thirdWing).toBe(true);
  });
});

// The Ancient Smith (our ReforgeMixRecipes.cpp AddAncientSmithRecipes, S AncientOptionMergeCrafting.cs).
describe('the Ancient Smith', () => {
  const SMITH = ancientSmithRecipes();
  const ancient = (group = 0, num = 5) => ({ group, num, lvl: 9, durability: 30, isAncient: true, ancientDiscriminator: 1 }) as Item;
  const excellent = (group = 0, num = 5) => ({ group, num, lvl: 9, durability: 30, isExcellent: true, excellentFlags: 3 }) as Item;
  const both = { ...ancient(), isExcellent: true, excellentFlags: 3 } as Item;
  const creation = it14(22);
  const chaos = { group: 12, num: 15, durability: 1 } as Item;
  const stone = it14(ANCIENT_SOUL_STONE);
  const SMITH_TYPE = ANCIENT_SMITH.mixType;

  it('has a merge and a removal over the equipment range, numbered by place', () => {
    expect(SMITH.map(r => r.mixId)).toEqual([116, 117]);
    expect(SMITH.every((r, i) => r.index === i)).toBe(true);
    expect(SMITH.map(r => [r.zenType, r.zen, r.maxRate, r.charmOption, r.chaosCharmOption])).toEqual([
      ['A', 10_000_000, 80, 'A', 'A'],
      ['A', 5_000_000, 100, '', ''],
    ]);
  });

  it('merges a clean ancient and the excellent same item with the stone, Creation and Chaos', () => {
    const check = checkMix(SMITH, [ancient(), excellent(), stone, creation, chaos], SMITH_TYPE);
    expect(check.recipe?.mixId).toBe(MIX.ancientOptionMerge);
    expect([check.successRate, check.requiredZen]).toEqual([80, 10_000_000]);
    expect(check.recipe && recipeName(check.recipe)).toBe('Ancient Option Merge');
    // A ring matches the same record, and there is no merge without the stone.
    expect(checkMix(SMITH, [ancient(13, 21), excellent(13, 21), stone, creation, chaos], SMITH_TYPE).recipe?.index).toBe(0);
    expect(checkMix(SMITH, [ancient(), excellent(), creation, chaos], SMITH_TYPE).recipe).toBeNull();
  });

  it('takes a Talisman of Luck and one Jewel of Chaos Assembly into the merge', () => {
    const talisman = { group: 14, num: 53, durability: 2 } as Item;
    const check = checkMix(SMITH, [ancient(), excellent(), stone, creation, chaos, talisman, it14(157)], SMITH_TYPE);
    expect([check.recipe?.mixId, check.successRate, check.chaosCharms]).toEqual([MIX.ancientOptionMerge, 82, 1]);
  });

  it('removes the excellent options of an ancient item alone, certain, for 5,000,000', () => {
    const check = checkMix(SMITH, [both], SMITH_TYPE);
    expect([check.recipe?.mixId, check.successRate, check.requiredZen]).toEqual([MIX.ancientOptionRemoval, 100, 5_000_000]);
    expect(check.recipe && recipeName(check.recipe)).toBe('Ancient Option Removal');
    expect(checkMix(SMITH, [ancient()], SMITH_TYPE).recipe).toBeNull();
  });

  it('opens his own tray for NPC 770, the goblin\'s list stays the goblin\'s', () => {
    expect([REFORGE_MIX.npcTray?.(770), REFORGE_MIX.npcTray?.(238)]).toEqual([SMITH_TYPE, null]);
    expect(REFORGE_MIX.recipes([], SMITH_TYPE).map(r => r.mixId)).toEqual([116, 117]);
    expect(REFORGE_MIX.recipes(LIST, 3)).toBe(LIST);
    const tray = REFORGE_MIX.tray?.(SMITH_TYPE);
    expect(tray?.title).toBe('Ancient Smith');
    expect(tray?.lines.map(l => !!l.warn)).toEqual([false, false, false, true]);
    expect(REFORGE_MIX.tray?.(0)).toBeNull();
  });

  it('describes the stone in its tooltip, white then green', () => {
    expect(ancientSoulStoneLines(stone).map(l => [l.text, l.color])).toEqual([
      ['Moves every excellent option of an item onto a clean ancient copy of the same item.', 'white'],
      ['Combine it at the Ancient Smith with a Jewel of Creation and a Jewel of Chaos.', 'green'],
    ]);
    expect(ancientSoulStoneLines(it14(157))).toEqual([]);
  });
});

// Our ItemAddOption.bmd lists every 380 piece the server grants the Guardian option to, the socket sets
// too (S GuardianOptions.AddToLevel380Items); ReforgeMixRecipes.cpp MarkGuardianOptionItem.
const HARMONY = 'Data/Local/Eng/JewelOfHarmonyOption_eng.bmd';
const SOCKETS = 'Data/Local/Eng/socketitem_eng.bmd';
const OUR_ADD_OPTIONS = 'Data-reforge/Local/ItemAddOption.bmd';
const NO_TABLES = ![HARMONY, SOCKETS, OUR_ADD_OPTIONS].every(f => existsSync(f));

describe.skipIf(NO_TABLES)('the 380 option flag (MarkGuardianOptionItem)', () => {
  beforeAll(() => loadItemOptionTables(new Uint8Array(readFileSync(HARMONY)), new Uint8Array(readFileSync(SOCKETS)), new Uint8Array(readFileSync(OUR_ADD_OPTIONS))));
  const ADD380 = 2;
  const flagged = (item: Item, mixType: number) => {
    const mix = { type: code(item.group, item.num), special: 0, chaosCharm: false, thirdWing: false, canStack: false, count: 1, durability: 1 } as Parameters<typeof adjustMixItem>[0];
    adjustMixItem(mix, item, mixType);
    return (mix.special & ADD380) !== 0;
  };

  it('marks a socketed piece only in the 380 window', () => {
    const socketed = { group: 8, num: 45, socketCount: 3 } as Item; // Titan Armor
    expect(flagged(socketed, 2)).toBe(true);
    expect(flagged(socketed, 0)).toBe(false);
    expect(flagged({ group: 8, num: 45 } as Item, 0)).toBe(true);
  });

  it('reads our table: the socket sets and the Tigris set take it, a shield does not', () => {
    for (const [group, num] of [[0, 26], [5, 20], [7, 44], [8, 104], [11, 53]]) expect(flagged({ group, num } as Item, 2)).toBe(true);
    expect(flagged({ group: 6, num: 17 } as Item, 2)).toBe(false);
    expect(flagged({ group: 12, num: 36 } as Item, 2)).toBe(false);
  });
});
