import {
  PCT_CURVED,
  PCT_ELASTIC_RAGE_L,
  PCT_ELASTIC_RAGE_R,
  PCT_HEAVY,
  PCT_MASK_ALPHA,
  PCT_SHORT_SHOULDER,
  type ClothSpec,
} from '@/controllers/cloth';
import { CAPE_OF_FIGHTER, CAPE_OF_OVERRULE, WING_GROUP, capeClothOf } from '@/controllers/actors/wings';
import type { Item } from '@/ecs/world';

/** The Rage Fighter's cloth 0, the cape: `Item\NCcape.tga` (BITMAP_NCCAPE), 180 x 170 (ZzzCharacter.cpp:9799-9806). */
export const CAPE_OF_FIGHTER_CLOTH: ClothSpec = {
  bone: 19,
  at: [0, 15, 5],
  grid: [10, 10],
  size: [180, 170],
  front: 'Item/NCcape.OZT',
  back: 'Item/NCcape.OZT',
  flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY | PCT_MASK_ALPHA,
  spheres: [
    [-10, -10, -10, 35, 17],
    [10, -10, -10, 35, 17],
    [-10, -10, 20, 37, 17],
    [10, -10, 20, 37, 17],
  ],
};

/** Under the Cape of Overrule: `Item\monke_manto.TGA` (BITMAP_MANTOE), the same cape otherwise (:9783-9790). */
export const CAPE_OF_OVERRULE_CLOTH: ClothSpec = {
  ...CAPE_OF_FIGHTER_CLOTH,
  front: 'Item/monke_manto.OZT',
  back: 'Item/monke_manto.OZT',
};

/** The Overrule's straps, cloths 1 and 2: `Item\monk_manto01.TGA` (BITMAP_MANTO01), blown out left and right (:9808-9817). */
const strap = (x: number, flags: number, reach: number): ClothSpec => ({
  bone: 19,
  at: [x, 15, 2],
  grid: [2, 5],
  size: [12, 180],
  front: 'Item/monk_manto01.OZT',
  back: 'Item/monk_manto01.OZT',
  flags: flags | PCT_MASK_ALPHA,
  spheres: [
    [0, -15, -20, 35, 2],
    [0, 0, 0, reach, 17],
  ],
});
export const CAPE_OF_OVERRULE_STRAPS = [strap(25, PCT_ELASTIC_RAGE_L, 45), strap(-25, PCT_ELASTIC_RAGE_R, 50)] as const;

export const isCapeOfFighter = (wing: Item | null): boolean => wing?.group === WING_GROUP && wing.num === CAPE_OF_FIGHTER;
export const isCapeOfOverrule = (wing: Item | null): boolean => wing?.group === WING_GROUP && wing.num === CAPE_OF_OVERRULE;

/** `MODEL_LITTLE_WARRIORS_CLOAK` (wing 135, a later season's shop cape): the Cape of Fighter at 150 x 130 (ZzzCharacter.cpp, MuMain). */
export const LITTLE_WARRIORS_CLOAK = 135;
export const LITTLE_WARRIORS_CLOAK_CLOTH: ClothSpec = { ...CAPE_OF_FIGHTER_CLOTH, size: [150, 130] };
export const isLittleWarriorsCloak = (wing: Item | null): boolean => wing?.group === WING_GROUP && wing.num === LITTLE_WARRIORS_CLOAK;

/** A cape an item file hangs as cloth (`Wing.cloth`, Mu Reforge's Hero Cape): the Cape of Overrule's shape in its texture. */
export function fighterClothOf(wing: Item | null): ClothSpec | null {
  const cloth = capeClothOf(wing);
  return cloth ? { ...CAPE_OF_FIGHTER_CLOTH, front: cloth.texture, back: cloth.texture } : null;
}
