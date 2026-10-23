import { describe, expect, it } from 'vitest';
import { i18n } from '@/i18n';
import { ItemsDatabase, itemBaseName } from '../../shared/items/itemsDatabase';
import { isFastWing, wingLinkMatrix, wingSpec } from '@/controllers/actors/wings';
import { isBow, isCrossbow, isSwordformGloves, swordformGlovesModel } from '@/controllers/actors/weaponClass';
import { itemHeldSprites } from '@/controllers/item_fx/itemLooks';
import { ammoReload, attackRange, hasAmmo } from '@/controllers/combat/weaponRange';
import type { Item } from '@/ecs/world';
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
    expect(wingSpec(item(12, 59))?.link?.offset).toEqual([0, -13, 0]);
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
});
