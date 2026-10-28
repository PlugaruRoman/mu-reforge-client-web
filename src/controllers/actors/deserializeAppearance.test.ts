import { describe, expect, it } from 'vitest';
import { CharacterClassNumber } from '@/core/types';
import {
  classFromAppearance,
  deserializeAppearance,
  deserializeAppearanceExtended,
  deserializePreview,
  isAppearanceBlank,
} from './deserializeAppearance';

const view = (...bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

describe('isAppearanceBlank', () => {
  it('treats an empty, all-zero or all-0xFF preview as blank', () => {
    expect(isAppearanceBlank(view(0, 0, 0))).toBe(true);
    expect(isAppearanceBlank(view(0xff, 0xff, 0xff))).toBe(true);
    expect(isAppearanceBlank(view())).toBe(true);
  });

  it('keeps a real preview', () => {
    expect(isAppearanceBlank(view(0xc0, 0xff, 0xff))).toBe(false);
    expect(isAppearanceBlank(view(0xff, 0xff, 0xf3))).toBe(false);
  });
});

/**
 * A 27-byte extended preview as S RemoteView/AppearanceSerializerExtended.cs:80-133 writes it:
 * class, pose, seven 3-byte items (group/number, glow << 4 | excellent 0x08 | ancient 0x04),
 * then wings and pet in 2 bytes each; an empty slot is 0xFF 0xFF.
 */
function extendedPreview(pet: [number, number]): DataView {
  const empty = [0xff, 0xff, 0x00];
  return view(
    CharacterClassNumber.DarkKnight, 0x00,
    0x00, 0x01, 0x48, // Short Sword 0/1 +9: glow (9 - 1) / 2 = 4, excellent
    ...empty, ...empty, ...empty, ...empty, ...empty, ...empty,
    0xff, 0xff, // no wings
    ...pet
  );
}

describe('deserializeAppearanceExtended', () => {
  it('turns the glow level back into an item level', () => {
    const app = deserializeAppearanceExtended(extendedPreview([0xff, 0xff]));
    expect(app.cls).toBe(CharacterClassNumber.DarkKnight);
    expect(app.leftHand).toMatchObject({ group: 0, num: 1, lvl: 9, isExcellent: true, isAncient: false });
    expect(app.rightHand).toBeNull();
    expect(app.wings).toBeNull();
    expect(app.pet).toBeNull();
  });

  it('masks the Fenrir kind out of the pet number', () => {
    // Horn of Fenrir 13/37 with the gold kind (0b110) in byte 0 (:121-124).
    expect(deserializeAppearanceExtended(extendedPreview([0xd6, 0x25])).pet).toEqual({ group: 13, num: 37, lvl: 0, excellentFlags: 0x04 });
    expect(deserializeAppearanceExtended(extendedPreview([0xd2, 0x25])).pet).toEqual({ group: 13, num: 37, lvl: 0, excellentFlags: 0x01 });
    expect(deserializeAppearanceExtended(extendedPreview([0xd0, 0x03])).pet).toEqual({ group: 13, num: 3, lvl: 0 });
  });

  it('is what a 27-byte character list preview is read with', () => {
    const app = extendedPreview([0xd4, 0x25]);
    expect(classFromAppearance(app)).toBe(CharacterClassNumber.DarkKnight);
    expect(deserializePreview(app).pet).toMatchObject({ num: 37, excellentFlags: 0x02 });
  });
});

/** An 18-byte preview: class in byte 0, slot 0 empty, slot 1 = group/num. */
function preview(cls: number, slot1Group: number, slot1Num: number) {
  const b = new Uint8Array(18).fill(0);
  b[0] = cls << 3;
  b[1] = 0xff;
  b[12] = 0xe0;
  b[2] = slot1Num;
  b[13] = (slot1Group << 5) & 0xff;
  return new DataView(b.buffer);
}

describe('Dark Raven in slot 1', () => {
  it('reads the Legendary Staff bits of a Dark Lord as the raven', () => {
    // The server writes group 13 << 5, which keeps only 5.
    const app = deserializeAppearance(preview(CharacterClassNumber.DarkLord, 13, 5));
    expect(app.rightHand).toMatchObject({ group: 13, num: 5 });
  });

  it('does the same for a Lord Emperor', () => {
    const app = deserializeAppearance(preview(CharacterClassNumber.LordEmperor, 13, 5));
    expect(app.rightHand).toMatchObject({ group: 13, num: 5 });
  });

  it('leaves 5/5 alone for other classes', () => {
    const app = deserializeAppearance(preview(CharacterClassNumber.DarkWizard, 5, 5));
    expect(app.rightHand).toMatchObject({ group: 5, num: 5 });
  });
});
