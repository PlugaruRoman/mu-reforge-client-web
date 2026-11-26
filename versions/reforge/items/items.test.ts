import { beforeAll, describe, expect, it } from 'vitest';
import { i18n } from '@/i18n';
import { ItemsDatabase, itemBaseName } from '../../shared/items/itemsDatabase';
import { isFastWing, wingLinkMatrix, wingSpec } from '@/controllers/actors/wings';
import { isBook, isBow, isCrossbow, isShield, isSwordformGloves, swordformGlovesModel } from '@/controllers/actors/weaponClass';
import { itemHeldSprites } from '@/controllers/item_fx/itemLooks';
import { ammoReload, attackRange, hasAmmo } from '@/controllers/combat/weaponRange';
import { dropLabel, isJewel, isSocketItem, itemDef, itemValue } from '@/controllers/item_rules';
import { isRidingMount, mountKind, petSpec, ridesDarkHorse } from '@/controllers/pets';
import type { Item } from '@/ecs/world';
import { loadGameVersion } from '@/version';
import { reforgeItems } from './all';

const item = (group: number, num: number) => ({ group, num, lvl: 0 });

describe('reforge items', () => {
  it('lays our items over Season 6 in the one registry', () => {
    expect(reforgeItems.length).toBeGreaterThan(100);
    expect(ItemsDatabase.getItem(12, 51)?.ItemName).toBe('Heavenly Wings');
    expect(ItemsDatabase.getItem(8, 42)?.ItemName).toBe('Demonic Armor');
    expect(ItemsDatabase.getItem(8, 53)).toMatchObject({ ItemName: 'Merlin Armor', X: 2, Y: 3 });
    expect(ItemsDatabase.getItem(8, 104)?.szModelFolder).toBe('Player/');
    // A stock item we do not name stays Season 6's.
    expect(ItemsDatabase.getItem(12, 36)?.ItemName).toBe('Wing of Storm');
  });

  it('draws the 4th and Hero wings on the back bone, the cloaks turned, with their bone glow', () => {
    const heavenly = wingSpec(item(12, 51));
    expect(heavenly?.sprites?.[0].bones.length).toBeGreaterThan(0);
    expect(wingLinkMatrix(heavenly)).toBeNull();
    expect(wingSpec(item(12, 55))?.link).toEqual({ angle: [0, 0, 180], offset: [0, 0, 0] });
    expect(wingSpec(item(12, 59))?.link).toEqual({ angle: [0, 0, 180], offset: [0, 0, 0] });
    expect(wingLinkMatrix(wingSpec(item(12, 59)))).not.toBeNull();
    expect(wingSpec(item(12, 130))?.clothOnly).toBe(true);
    expect(isFastWing(item(12, 58))).toBe(true);
    expect(isFastWing(item(12, 131))).toBe(false);
  });

  it('wears the Hero claw as a pair and shoots the Hero bows as bow and crossbow', () => {
    expect(isSwordformGloves(item(0, 30))).toBe(true);
    expect(swordformGlovesModel(item(0, 38), 0)).toBe('HeroClaw_R.glb');
    expect(swordformGlovesModel(item(0, 38), 1)).toBe('HeroClaw_L.glb');
    expect(isBow(item(4, 27))).toBe(true);
    expect(isCrossbow(item(4, 28))).toBe(true);
    expect(isBow(item(4, 28))).toBe(false);
  });

  // Server: slot 1 sets IsBowEquipped, slot 0 IsCrossBowEquipped (Weapons.cs), so 25/27 want arrows, 26/28 bolts.
  it('shoots the Hero bows with arrows and the Hero crossbows with bolts, at bow range', () => {
    const bow = (num: number, durability = 255) => ({ group: 4, num, durability }) as Item;
    expect(hasAmmo({ leftHand: bow(25), rightHand: bow(15) })).toBe(true);
    expect(hasAmmo({ leftHand: bow(25), rightHand: bow(7) })).toBe(false);
    expect(hasAmmo({ leftHand: bow(7), rightHand: bow(26) })).toBe(true);
    expect(hasAmmo({ leftHand: bow(15), rightHand: bow(28) })).toBe(false);
    expect(attackRange({ leftHand: null, rightHand: bow(28) })).toBe(6);
    expect(ammoReload({ leftHand: null, rightHand: bow(26) }, [bow(15), bow(7)], 0, 0, 1)).toEqual({ from: 1, to: 0 });
  });

  it('lights a carried Hero weapon on its bones, with stars at grip and tip', () => {
    const sprites = itemHeldSprites(0, 29) ?? [];
    expect(sprites.filter(s => s.texture === 'flare01').length).toBeGreaterThan(1);
    expect(sprites.filter(s => s.texture === 'shiny02')).toHaveLength(2);
  });

  it('names our items in the player language from our client, after the pack fixes', () => {
    try {
      i18n.setLanguage('de');
      expect(itemBaseName(8, 39)).toBe('Sturmwindrüstung');
      i18n.setLanguage('es');
      expect(itemBaseName(8, 39)).toBe('Armadura Viento Violento');
      // A Spanish pack fix still wins (Pergamino, not our Rollo).
      expect(itemBaseName(14, 74)).toBe('Pergamino de Ira');
      i18n.setLanguage('en');
      expect(itemBaseName(8, 39)).toBe('Violent Wind Armor');
    } finally {
      i18n.setLanguage('en');
    }
  });

  // Our client's `jewel` tag and ReforgeGroundItemLabel.cpp: the Ancient Soul Stone is a jewel, yellow and bold.
  it('counts our tagged jewels as jewels and draws our ground names', () => {
    const jewel = (num: number) => {
      const def = itemDef(14, num);
      return !!def && isJewel(def);
    };
    const ground = (num: number) => dropLabel({ isMoney: false, item: item(14, num), group: 14, num });
    expect(ItemsDatabase.getItem(14, 178)).toMatchObject({ ItemName: 'Ancient Soul Stone', X: 1, Y: 1, szModelName: 'AncientGem.glb' });
    expect([124, 125, 157, 176, 178].map(jewel)).toEqual([true, true, true, true, true]);
    expect([177, 164].map(jewel)).toEqual([false, false]);
    expect(ground(178)).toEqual({ colour: '#ffcc19', bold: true, setItem: false });
    expect(ground(157)).toEqual(ground(178));
    expect(ground(176).colour).toBe('#59d8ff');
    expect(ground(164).colour).toBe('#e58721');
  });

  // Our client's muun pets and Jewel of Nightmare (w_PetProcess.cpp, ReforgeGroundItemLabel.cpp; S MuunPets.cs).
  it('makes the muun pets Pet Panda followers on their own models, the Jewel of Nightmare a yellow jewel', () => {
    expect(ItemsDatabase.getItem(13, 155)).toMatchObject({ ItemName: 'Medusa', X: 1, Y: 2, ItemSlot: 8, szModelFolder: 'Item/Muun/', szModelName: 'medusaUp.glb' });
    const panda = petSpec(item(13, 80));
    const muun = petSpec(item(13, 150));
    expect(muun).toMatchObject({ kind: 'follower', model: 'Item/Muun/DragonKnight.glb', scale: 0.9, follow: panda?.follow });
    expect(petSpec(item(13, 150))).toBe(muun);
    for (const num of [151, 152, 153, 154, 155]) expect(petSpec(item(13, num))?.kind).toBe('follower');
    expect([isRidingMount(item(13, 150)), mountKind(item(13, 150))]).toEqual([false, null]);
    expect(itemValue({ group: 13, num: 150, lvl: 0, durability: 255 } as Item, 0)).toBe(150_000);

    const def = itemDef(14, 179);
    expect(def && isJewel(def)).toBe(true);
    expect(ItemsDatabase.getItem(14, 179)).toMatchObject({ ItemName: 'Jewel of Nightmare', X: 1, Y: 1, szModelName: 'JewelOfNightmare.glb' });
    expect(dropLabel({ isMoney: false, item: item(14, 179), group: 14, num: 179 })).toEqual({ colour: '#ffcc19', bold: true, setItem: false });
  });

  // Our client's Divine Horses (ReforgeDivineHorse.h, GOBoid.cpp; S MuunPets.cs, mix 119).
  it('rides the Divine Horses like the Dark Horse, on their own model', () => {
    expect(ItemsDatabase.getItem(13, 156)).toMatchObject({ ItemName: 'Divine Horse', X: 1, Y: 2, ItemSlot: 8, Skill: 62, DL: 1, 'DK/BK': 0 });
    expect(ItemsDatabase.getItem(13, 161)).toMatchObject({ szModelFolder: 'Item/DivineHorse/', szModelName: 'Divine_Horse.glb' });
    const darkHorse = petSpec(item(13, 4));
    const divine = petSpec(item(13, 156));
    expect(divine).toMatchObject({ kind: 'mount', model: 'Item/DivineHorse/Divine_Horse.glb', scale: 1, riderClips: 'horse', moveAction: darkHorse?.moveAction, blurBone: 7 });
    expect(divine?.boneLights?.flatMap(l => l.bones)).toHaveLength(41);
    expect(divine?.classicShadow).toEqual({});
    expect(petSpec(item(13, 161))).toBe(divine);
    for (const num of [156, 157, 158, 159, 160, 161]) {
      expect([isRidingMount(item(13, num)), mountKind(item(13, num)), mountKind(item(13, num), true), ridesDarkHorse(item(13, num))]).toEqual([true, 'horse', null, true]);
    }
    expect([ridesDarkHorse(item(13, 4)), ridesDarkHorse(item(13, 37)), ridesDarkHorse(item(13, 150))]).toEqual([true, false, false]);
    expect(itemValue({ group: 13, num: 156, lvl: 0, durability: 255 } as Item, 0)).toBe(150_000);
  });

  // The Imperial socket items (S Items/Weapons.cs CreateImperialWeapons, Items/Armors.cs CreateImperialShield,
  // Items/SocketSystem.cs; our client's IsSocketItem and HeroClawHands.cpp).
  describe('the Imperial socket items', () => {
    beforeAll(() => loadGameVersion('reforge'), 60_000);

    it('carries the claw, the book and the shield with the values, sizes and classes of the server', () => {
      expect(ItemsDatabase.getItem(0, 40)).toMatchObject({
        ItemName: 'Imperial Claw', X: 1, Y: 2, ItemSlot: 0, Skill: 270, ItemLvl: 138, Durability: 95, DmgMin: 113, DmgMax: 119,
        Speed: 40, RequiredLvl: 380, Strength: 105, Agi: 50, RF: 1, 'DK/BK': 0, szModelName: 'ImperialClaw.glb',
      });
      expect(ItemsDatabase.getItem(5, 24)).toMatchObject({
        ItemName: 'Imperial Book', X: 1, Y: 2, ItemSlot: 1, Skill: 225, ItemLvl: 103, MagicDur: 55, Speed: 25, MagicPwr: 70,
        Agi: 30, Ene: 210, SUM: 1, 'DW/SM': 0, szModelName: 'ImperialBook.glb',
      });
      expect(ItemsDatabase.getItem(6, 22)).toMatchObject({
        ItemName: 'Imperial Shield', X: 2, Y: 2, ItemSlot: 1, Skill: 18, ItemLvl: 104, Dur: 51, Def: 17, DefRate: 82,
        Str: 105, Agi: 45, DL: 1, 'DK/BK': 0, szModelName: 'ImperialShield.glb',
      });
    });

    it('wears the claw as its own pair, never draws the book, and holds the shield', () => {
      expect(isSwordformGloves(item(0, 40))).toBe(true);
      expect(swordformGlovesModel(item(0, 40), 0)).toBe('ImperialClaw_R.glb');
      expect(swordformGlovesModel(item(0, 40), 1)).toBe('ImperialClaw_L.glb');
      expect(isBook(item(5, 24))).toBe(true);
      expect(isShield(item(6, 22))).toBe(true);
    });

    it('takes them as socket items, beside the stock ones, and nothing next to them', () => {
      for (const [g, n] of [[0, 40], [5, 24], [6, 22], [0, 26], [6, 17]]) expect(isSocketItem(g, n)).toBe(true);
      for (const [g, n] of [[0, 35], [0, 41], [5, 23], [6, 21]]) expect(isSocketItem(g, n)).toBe(false);
    });
  });
});
