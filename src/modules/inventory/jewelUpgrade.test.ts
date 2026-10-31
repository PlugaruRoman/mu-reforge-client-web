import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { InventoryConstants } from '@/core/inventoryConstants';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { Item } from '../../ecs/world';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
/** The world's `jewelryUpgrade`, set per test; every other setting is the original's. */
const server = vi.hoisted(() => ({ jewelryUpgrade: true }));
vi.mock('../servers/serverManifest', () => ({
  serverSetting: (key: string) => (key === 'jewelryUpgrade' ? server.jewelryUpgrade : false),
}));
const { jewelTargetError } = await import('./jewelUpgrade');
const { jewelryUpgradeAllowed } = await import('./jewelryUpgrade');
const { jewelTargetFacts } = await import('./reforgeJewelFacts');
const { loadGameVersion } = await import('@/version');

const IN_BAG = InventoryConstants.EquippableSlotsCount;
const item = (group: number, num: number, lvl = 0) => ({ group, num, lvl }) as Item;
const BLESS = item(14, 13);
const SOUL = item(14, 14);
const LIFE = item(14, 16);
const HARMONY = item(14, 42);
const RING_OF_FIRE = item(13, 21);
const PENDANT_OF_ICE = item(13, 25, 7);
const WIZARDS_RING = item(13, 20);

describe('dropping a jewel on gear', () => {
  afterEach(() => {
    server.jewelryUpgrade = true;
    setFidelityChoice(FIDELITY_DEFAULT, {});
  });

  it('lets a sword take Bless and refuses a ring, as the original', () => {
    expect(jewelTargetError(BLESS, item(0, 5), IN_BAG)).toBeNull();
    expect(jewelTargetError(BLESS, RING_OF_FIRE, IN_BAG)).not.toBeNull();
  });

  it('lets Bless, Soul and Life go on a ring or pendant when jewelry is allowed', () => {
    expect(jewelTargetError(BLESS, RING_OF_FIRE, IN_BAG, true)).toBeNull();
    expect(jewelTargetError(SOUL, PENDANT_OF_ICE, IN_BAG, true)).toBeNull();
    expect(jewelTargetError(LIFE, RING_OF_FIRE, IN_BAG, true)).toBeNull();
    expect(jewelTargetError(BLESS, PENDANT_OF_ICE, IN_BAG, true)).not.toBeNull();
    expect(jewelTargetError(HARMONY, RING_OF_FIRE, IN_BAG, true)).not.toBeNull();
    expect(jewelTargetError(BLESS, WIZARDS_RING, IN_BAG, true)).not.toBeNull();
  });

  it('allows jewelry with jewelryUpgrade on a world that allows it, never on Classic', () => {
    expect(jewelryUpgradeAllowed()).toBe(true);
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(jewelryUpgradeAllowed()).toBe(false);
    setFidelityChoice(FIDELITY_DEFAULT, { jewelryUpgrade: false });
    expect(jewelryUpgradeAllowed()).toBe(false);
    setFidelityChoice(FIDELITY_DEFAULT, {});
    server.jewelryUpgrade = false;
    expect(jewelryUpgradeAllowed()).toBe(false);
  });
});

// Mu Reforge's jewels (our C++ client's GameLogic/Reforge/ReforgeJewels.cpp `CanApply`).
describe('our jewels', () => {
  const SKILL = item(14, 124);
  const LUCK = item(14, 125);
  const SEA = item(14, 176);
  const GEM = item(14, 177);
  const BLADE = item(0, 5); // Skill 22
  const KRIS = item(0, 0); // no skill
  const err = (jewel: Item, target: Item, slot: number) => jewelTargetError(jewel, target, slot, false, jewelTargetFacts(target));

  it('Jewel of Skill: an item with a skill in its data that lacks it', () => {
    expect(err(SKILL, BLADE, IN_BAG)).toBeNull();
    expect(err(SKILL, { ...BLADE, hasSkill: true }, IN_BAG)).not.toBeNull();
    expect(err(SKILL, KRIS, IN_BAG)).not.toBeNull();
  });

  it('Jewel of Luck: gear or wings without luck, never ammunition', () => {
    expect(err(LUCK, KRIS, IN_BAG)).toBeNull();
    expect(err(LUCK, { ...KRIS, luck: true }, IN_BAG)).not.toBeNull();
    expect(err(LUCK, item(4, 15), IN_BAG)).not.toBeNull();
    expect(err(LUCK, RING_OF_FIRE, IN_BAG)).not.toBeNull();
  });

  it('Jewel of Sea: an upgradeable ring or pendant below +9', () => {
    expect(err(SEA, RING_OF_FIRE, IN_BAG)).toBeNull();
    expect(err(SEA, item(13, 25, 9), IN_BAG)).not.toBeNull();
    expect(err(SEA, WIZARDS_RING, IN_BAG)).not.toBeNull();
    expect(err(SEA, BLADE, IN_BAG)).not.toBeNull();
  });

  it('Socket Gem: a socket item with fewer than five sockets', () => {
    const socketSword = item(0, 26);
    expect(err(GEM, { ...socketSword, socketCount: 3 }, IN_BAG)).toBeNull();
    expect(err(GEM, { ...socketSword, socketCount: 5 }, IN_BAG)).not.toBeNull();
    expect(err(GEM, BLADE, IN_BAG)).not.toBeNull();
  });

  it('is refused on worn gear, as the server refuses it', () => {
    expect(err(LUCK, KRIS, 0)).not.toBeNull();
  });

  it('Bless and Soul go on our 4th and Hero wings', () => {
    expect(err(BLESS, item(12, 51, 3), IN_BAG)).toBeNull();
    expect(err(SOUL, item(12, 66, 6), IN_BAG)).toBeNull();
  });
});

// The Jewel of Harmony: Season 6 refuses ancient and socket items; Mu Reforge takes ancient ones, and both
// refuse a socket item by type, sockets or not (S HarmonyJewelConsumeHandlerPlugIn; our client's
// InventoryCtrl.cpp DropActsOn, SocketSystem.cpp IsSocketItem).
describe('the Jewel of Harmony', () => {
  const err = (target: Item) => jewelTargetError(HARMONY, target, IN_BAG, false, jewelTargetFacts(target));
  const ancient = { ...item(8, 5), isAncient: true, ancientDiscriminator: 1 } as Item;

  it('Season 6: no ancient item, no socket item', () => {
    expect(err(item(0, 5))).toBeNull();
    expect(err(ancient)).not.toBeNull();
    expect(err(item(0, 26))).not.toBeNull();
    expect(err(item(5, 20))).not.toBeNull(); // the Eternal Wing Stick
    expect(err(item(5, 32))).toBeNull();
    expect(err(item(8, 44))).toBeNull(); // Eternal Wing Armor is no socket item there
  });

  describe('Mu Reforge', () => {
    beforeAll(() => loadGameVersion('reforge'), 60_000);
    afterAll(() => loadGameVersion('season6'));

    it('takes an ancient item, refuses the Eternal Wing and Tigris sets', () => {
      expect(err(ancient)).toBeNull();
      for (const group of [7, 8, 9, 10, 11]) expect(err(item(group, 44))).not.toBeNull();
      for (const group of [7, 8, 9, 11]) expect(err(item(group, 104))).not.toBeNull();
      expect(err(item(10, 104))).toBeNull(); // Tigris has no gloves
    });
  });
});
