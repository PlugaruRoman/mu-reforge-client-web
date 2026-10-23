import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { cloaksFor, type CloakSet, type CloakWearer } from '@/controllers/actors/cloaks';
import { capeClothOf } from '@/controllers/actors/wings';
import type { ClothMeshSpec, ClothSpec } from '@/controllers/cloth';
import { CharacterClassNumber as C } from '@/core/types';
import type { Item } from '@/ecs/world';
import '../../shared/cloaks/index';
import './all';

const HERO_CAPE: Item = { group: 12, num: 59 };
const SMALL_CAPE_OF_LORD: Item = { group: 12, num: 130 };
const LITTLE_WARRIORS_CLOAK: Item = { group: 12, num: 135 };
const HERO_TEXTURE = 'Item/Cape_Bronze25_0.OZT';

class FakeSet implements CloakSet {
  built = false;
  count = 0;
  readonly specs: (ClothSpec | null)[] = [];
  readonly drawn = new Set<number>();
  drops = 0;
  build(slot: number, spec: ClothSpec | ClothMeshSpec) {
    this.specs[slot] = spec as ClothSpec;
    this.built = true;
  }
  destroy(slot: number) {
    this.specs[slot] = null;
  }
  has(slot: number) {
    return !!this.specs[slot];
  }
  draw(slot: number) {
    if (this.specs[slot]) this.drawn.add(slot);
  }
  drop() {
    this.drops++;
    this.specs.length = 0;
    this.built = false;
    this.count = 0;
  }
}

const wearer = (over: Partial<CloakWearer>): CloakWearer => ({
  charClass: C.DarkLord, wing: null, wingBefore: over.wing ?? null, armor: null, skin: null, chaosCastle: false, netId: null, hero: true, guild: null, monster: null, rig: true, pants: null, shadowPass: false, fading: false, ...over,
});

function wear(over: Partial<CloakWearer>, set = new FakeSet()) {
  cloaksFor(wearer(over), set);
  return set;
}

describe('cape cloths of our wings', () => {
  it('hangs the Hero Cape as a Dark Lord cape in its own texture', () => {
    expect(capeClothOf(HERO_CAPE)).toEqual({ texture: HERO_TEXTURE, mesh: 0 });
    const set = wear({ wing: HERO_CAPE });
    expect(set.specs[2]).toMatchObject({ front: HERO_TEXTURE, size: [180, 180], bone: 19 });
    expect(set.drawn.has(2)).toBe(true);
  });

  it('hangs the Hero Cape as a Rage Fighter cape', () => {
    const set = wear({ charClass: C.RageFighter, wing: HERO_CAPE });
    expect(set.specs[0]).toMatchObject({ front: HERO_TEXTURE, size: [180, 170], at: [0, 15, 5] });
    expect(set.drawn.has(0)).toBe(true);
  });

  it('rebuilds the set when the Hero Cape goes on or off', () => {
    const set = wear({ wing: null });
    wear({ wing: HERO_CAPE, wingBefore: null }, set);
    expect(set.drops).toBe(1);
    expect(set.specs[2]?.front).toBe(HERO_TEXTURE);
    wear({ wing: null, wingBefore: HERO_CAPE }, set);
    expect(set.drops).toBe(2);
  });

  it('hangs the shop capes as the small Cape of Lord and the Little Warrior cloak', () => {
    expect(wear({ wing: SMALL_CAPE_OF_LORD }).specs[2]).toMatchObject({ front: 'Player/DarklordRobe.OZT', size: [100, 100] });
    const rf = wear({ charClass: C.RageFighter, wing: LITTLE_WARRIORS_CLOAK });
    expect(rf.specs[0]).toMatchObject({ front: 'Item/NCcape.OZT', size: [150, 130] });
    expect(rf.drawn.has(0)).toBe(true);
  });
});
