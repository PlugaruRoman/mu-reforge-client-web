import { describe, expect, it } from 'vitest';
import { ItemSerializerExtended } from './itemSerializerExtended';
import { harmonyOf, hasGuardianOption } from './itemOptions';
import { wingOptionKind } from './wingOptions';

// Fixtures written by hand from OpenMU `ItemSerializerExtended.SerializeItem`
// (S RemoteView/ItemSerializerExtended.cs:48-97): group/number, level, durability, flags,
// then option, excellent, ancient, harmony, socket bytes in that order.
const read = (bytes: number[], at = 0) => ItemSerializerExtended.DeserializeItem(Uint8Array.from(bytes), at);

describe('ItemSerializerExtended', () => {
  it('reads a plain item in 5 bytes', () => {
    // Short Sword 0/1, +0, durability 20, no flags.
    const { item, length } = read([0x00, 0x01, 0x00, 20, 0x00]);
    expect(length).toBe(5);
    expect(item).toMatchObject({ group: 0, num: 1, lvl: 0, durability: 20, isExcellent: false });
    expect(item.luck).toBeUndefined();
    expect(item.hasSkill).toBeUndefined();
    expect(item.optionLevel).toBeUndefined();
    expect(item.isAncient).toBeUndefined();
    expect(item.socketCount).toBe(0);
  });

  it('reads a +13 excellent item with luck, skill and option +16', () => {
    // 0/5 +13, durability 80, flags Option|Luck|Skill|Excellent, option level 4, all six excellent bits.
    const { item, length } = read([0x00, 0x05, 13, 80, 0x0f, 0x04, 0x3f]);
    expect(length).toBe(7);
    expect(item).toMatchObject({
      group: 0, num: 5, lvl: 13, durability: 80, luck: true, hasSkill: true,
      optionLevel: 4, excellentFlags: 0x3f, isExcellent: true,
    });
    // The 12-byte form: option level bits 0-1 in byte 1, bit 2 as 0x40 of byte 3.
    expect(item.raw).toEqual([0x05, 0x80 | (13 << 3) | 0x04, 80, 0x7f, 0, 0x00, 0, 0xff, 0xff, 0xff, 0xff, 0xff]);
  });

  it('reads an ancient item: discriminator and bonus level nibbles', () => {
    // 8/1 +5, durability 30, flags Option|Ancient, option level 2, ancient byte bonus 2 << 4 | set 1.
    const { item, length } = read([0x80, 0x01, 5, 30, 0x11, 0x02, 0x21]);
    expect(length).toBe(7);
    expect(item).toMatchObject({
      group: 8, num: 1, lvl: 5, optionLevel: 2, isAncient: true, ancientDiscriminator: 1, ancientBonusLevel: 2,
    });
  });

  it('reads a harmony option after the excellent byte', () => {
    // 0/1 +9, flags Excellent|Harmony, excellent bit 0, harmony option 3 level 7.
    const { item, length } = read([0x00, 0x01, 9, 32, 0x28, 0x01, 0x37]);
    expect(length).toBe(7);
    expect(item.excellentFlags).toBe(0x01);
    expect(harmonyOf(item)).toEqual({ option: 3, level: 7 });
  });

  it('reads a socket item with three slots and no bonus', () => {
    // Flamberge 0/26 +7, flags Skill|Sockets, socket byte 0xF << 4 | 3: a seed, an empty slot, a seed.
    const { item, length } = read([0x00, 26, 7, 64, 0x84, 0xf3, 51, 0xfe, 10]);
    expect(length).toBe(9);
    expect(item).toMatchObject({ group: 0, num: 26, hasSkill: true, socketCount: 3, sockets: [51, 0xfe, 10] });
    // "No bonus" is the nibble 0xF here and 0xFF in the 12-byte layout (S ItemSerializerHelper.cs:118, :234).
    expect(item.socketBonus).toBe(0xff);
  });

  it('reads a wing: option bits and the option type', () => {
    // Wings of Spirits 12/3 +11, durability 255, flags Option|Luck|Excellent, option type 2 level 3, wing bits 0x05.
    const { item, length } = read([0xc0, 0x03, 11, 255, 0x0b, 0x23, 0x05]);
    expect(length).toBe(7);
    expect(item).toMatchObject({
      group: 12, num: 3, lvl: 11, luck: true, optionLevel: 3, wingOptions: 0x05, wingOptionKind: 2, isExcellent: false,
    });
    expect(wingOptionKind(item)).toBe('life');
  });

  it('reads the Horn of Fenrir variant from the excellent byte', () => {
    // 13/37, flags Excellent, gold Fenrir 0x04 (ItemSerializerHelper.GetFenrirByte).
    const { item, length } = read([0xd0, 0x25, 0, 255, 0x08, 0x04]);
    expect(length).toBe(6);
    expect(item).toMatchObject({ group: 13, num: 37, excellentFlags: 0x04, isExcellent: false });
  });

  it('reads the longest item: every flag and five sockets in 15 bytes', () => {
    const bytes = [0x01, 0x05, 15, 1, 0xff, 0x17, 0x3f, 0x12, 0x45, 0x25, 1, 2, 3, 0xfe, 4];
    const { item, length } = read(bytes);
    expect(length).toBe(15);
    expect(item).toMatchObject({
      group: 0, num: 0x105, lvl: 15, optionLevel: 7, isAncient: true, ancientDiscriminator: 2, ancientBonusLevel: 1,
      socketCount: 5, sockets: [1, 2, 3, 0xfe, 4], socketBonus: 2,
    });
    expect(hasGuardianOption(item)).toBe(true);
  });

  it('reads from an offset and measures without parsing', () => {
    const bytes = Uint8Array.from([0xaa, 0xaa, 0x00, 0x05, 13, 80, 0x0f, 0x04, 0x3f]);
    expect(ItemSerializerExtended.ItemLength(bytes, 2)).toBe(7);
    expect(ItemSerializerExtended.DeserializeItem(bytes, 2).item.num).toBe(5);
  });
});
