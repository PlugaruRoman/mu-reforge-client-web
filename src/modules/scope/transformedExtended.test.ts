import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { readTransformedExtended } = await import('./net');

/**
 * C2 45 as NewPlayersInScopeExtendedPlugIn.cs writes it at 106.3: one character, id | 0x8000 when
 * spawned, the skin, the 27-byte appearance at 19, the effect count at 46, then 16 reserved effect
 * slots of which `count` are used (xml AddTransformedCharactersToScopeExtended).
 */
function packet(effects: number[]): DataView {
  const length = 5 + 47 + 16;
  const bytes = new Uint8Array(length);
  bytes.set([0xc2, 0, length, 0x45, 1], 0);
  const at = 5;
  bytes.set([0x80 | 0x01, 0x2c, 130, 140, 0x01, 0x8f], at); // id 0x12C spawned, x 130, y 140, skin 399
  bytes.set(Array.from('Skinned', c => c.charCodeAt(0)), at + 6);
  bytes.set([131, 141, (5 << 4) | 3], at + 16); // target, rotation 5, hero state 3
  bytes[at + 19] = 0x20; // class byte of the appearance: Soul Master (class 1 << 4 | evolution)
  bytes.fill(0xff, at + 20, at + 46);
  bytes[at + 46] = effects.length;
  bytes.set(effects, at + 47);
  return new DataView(bytes.buffer);
}

describe('AddTransformedCharactersToScopeExtended', () => {
  it('reads the fixed 47 bytes and the effect ids that follow', () => {
    const [char, ...rest] = readTransformedExtended(packet([2, 18]));
    expect(rest).toEqual([]);
    expect(char).toMatchObject({
      Id: 0x812c,
      CurrentPositionX: 130,
      CurrentPositionY: 140,
      Skin: 399,
      Name: 'Skinned',
      TargetPositionX: 131,
      TargetPositionY: 141,
      Rotation: 5,
      HeroState: 3,
      effects: [2, 18],
    });
    expect(char.appearance).toBeTruthy();
  });

  it('reads no effects when the count is 0, whatever the reserved slots hold', () => {
    expect(readTransformedExtended(packet([]))[0].effects).toEqual([]);
  });
});
