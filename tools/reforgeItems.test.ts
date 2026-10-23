import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { BMDTextureBone } from '../src/controllers/assets/bmd';
import { NEW_ITEMS, REFORGE_ITEMS_DIR, RENAMED, extras, glowBones, itemFile, otherNames, toRecord, type JsonItem } from './reforgeItems';

const WING_LAYOUT = ['Group', 'Index', 'ItemSlot', 'Skill', 'X', 'Y', 'Serial', 'Opt', 'Drop', 'ItemName', 'Lvl', 'Def', 'Dur', 'ReqLvl', 'Ene', 'Str', 'Agi', 'Comm', 'Zen', 'DW/SM', 'DK/BK', 'Elf/ME', 'MG', 'DL', 'SUM', 'RF', 'szModelFolder', 'szModelName'];
const WEAPON_LAYOUT = ['Group', 'Index', 'ItemSlot', 'Skill', 'X', 'Y', 'Serial', 'Option', 'Drop', 'ItemName', 'ItemLvl', 'DmgMin', 'DmgMax', 'Speed', 'Durability', 'MagicDur', 'MagicPwr', 'RequiredLvl', 'Strength', 'Agi', 'Ene', 'Vit', 'Command', 'Type', 'DW/SM', 'DK/BK', 'Elf/ME', 'MG', 'DL', 'SUM', 'RF', 'szModelFolder', 'szModelName'];

// Rows as our client's Data/Items/Group12_Wing.json and Group04_Bow.json carry them.
const heavenly: JsonItem = {
  number: 51, name: { en: 'Heavenly Wings' }, tags: ['valuable'], width: 5, height: 3, slot: 'wings',
  level: 150, durability: 255, defense: 75, requirements: { level: 400 }, classRequirements: { darkWizard: 3 },
};
const heroBow: JsonItem = {
  number: 25, name: { en: 'Hero Bow' }, width: 2, height: 4, slot: 'offHand', weaponKind: 'bow', twoHanded: true, skill: 24,
  level: 88, durability: 255, damageMin: 232, damageMax: 255, attackSpeed: 45, requirements: { strength: 43, dexterity: 119 },
  classRequirements: { fairyElf: 1 },
};

describe('reforgeItems', () => {
  it('fills a group layout from our row, in its order', () => {
    const wing = toRecord(12, heavenly, WING_LAYOUT, { folder: 'Item/', name: 'Wing401.glb' });
    expect(Object.keys(wing)).toEqual(WING_LAYOUT);
    expect(wing).toMatchObject({ Index: 51, ItemSlot: 7, X: 5, Y: 3, Lvl: 150, Def: 75, Dur: 255, ReqLvl: 400, 'DW/SM': 3, 'DK/BK': 0, szModelName: 'Wing401.glb' });

    const bow = toRecord(4, heroBow, WEAPON_LAYOUT, { folder: 'Item/', name: 'HeroBow.glb' });
    expect(bow).toMatchObject({ ItemSlot: 1, Skill: 24, TwoHand: 1, DmgMin: 232, DmgMax: 255, Speed: 45, Strength: 43, Agi: 119, 'Elf/ME': 1 });
    expect(Object.keys(bow).indexOf('TwoHand')).toBe(Object.keys(bow).indexOf('Y') + 1);
  });

  it('keeps our names in other languages, never a copy of the English one', () => {
    expect(otherNames({ ...heroBow, name: { en: 'Violent Wind Armor', de: 'Sturmwindrüstung', es: 'Violent Wind Armor', pt: '' } })).toEqual({ de: 'Sturmwindrüstung' });
    expect(otherNames(heroBow)).toBeUndefined();
  });

  it('lights every second bone of a wing and every bone of a weapon, never a dummy', () => {
    const bones = [{}, {}, BMDTextureBone.Dummy, {}, {}, {}];
    expect(glowBones(bones, false)).toEqual([1, 3, 5]);
    expect(glowBones(bones, true)).toEqual([1, 3, 4, 5]);
  });

  it('turns our cloaks, pulls the Hero cape in, and draws the shop capes as cloth only', () => {
    const bones = () => Array.from({ length: 6 }, () => ({}));
    const cape = { ...heavenly, tags: ['cape'] };
    expect(extras(12, heavenly, { number: 51, itemEffect: 'heavenlyWings' }, bones).Wing).toEqual({ fast: true });
    expect(extras(12, cape, { number: 55, itemEffect: 'controlCloak' }, bones).Wing).toEqual({ link: { angle: [0, 0, 180], offset: [0, 0, 0] }, fast: true });
    expect(extras(12, cape, { number: 59, model: 'heroCape', itemEffect: 'heroWings' }, bones).Wing).toEqual({ link: { angle: [0, 0, 180], offset: [0, -13, 0] }, fast: true });
    expect(extras(12, cape, { number: 130, model: 'capeOfLord' }, bones).Wing).toEqual({ clothOnly: true });
    // The Hero Cape's hanging mesh is a Dark Lord's or Rage Fighter's cloth, its .tga shipped as .OZT.
    expect(extras(12, cape, { number: 59, model: 'heroCape', itemEffect: 'heroWings' }, bones, () => 'Item/Cape_Bronze25_0.tga').Wing).toMatchObject({
      cloth: { texture: 'Item/Cape_Bronze25_0.OZT', mesh: 0 },
    });
  });

  it('gives a Hero weapon its glow with stars at grip and tip, and a launcher its kind', () => {
    const out = extras(4, heroBow, { number: 25, itemEffect: 'heroWeapon' }, () => Array.from({ length: 4 }, () => ({})));
    expect(out).toEqual({ BoneGlow: { color: [0.85, 0.62, 0.22], size: 0.9, bones: [1, 2, 3], stars: [0, 3] }, Launcher: 'bow' });
    expect(extras(0, { ...heroBow, weaponKind: 'glove' }, { number: 30, itemEffect: 'heroWeapon' }, () => [{}])).toEqual({});
  });

  it('writes an item file that defineItem reads', () => {
    expect(itemFile({ Group: 12, Index: 59, ItemName: "Hero's Cape", Wing: { fast: true } })).toContain(
      "  ItemName: 'Hero\\'s Cape',\n  Wing: { fast: true },\n"
    );
  });

  it('lists each item once, and the generated folder has every one', () => {
    expect(NEW_ITEMS).toHaveLength(81);
    expect(new Set([...NEW_ITEMS, ...RENAMED]).size).toBe(NEW_ITEMS.length + RENAMED.length);
    const files = readdirSync(REFORGE_ITEMS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .flatMap(d => readdirSync(join(REFORGE_ITEMS_DIR, d.name)));
    expect(files).toHaveLength(NEW_ITEMS.length + RENAMED.length);
    expect(existsSync(join(REFORGE_ITEMS_DIR, 'wings', 'heavenly_wings.ts'))).toBe(true);
  });
});
