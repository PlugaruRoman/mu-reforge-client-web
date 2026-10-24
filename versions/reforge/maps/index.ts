/**
 * What our client's `World1` / `World4` change in Season 6's Lorencia and Noria (`VersionData.maps`,
 * merged over the shared entries by `maps.layerFor`): the Fort Siege fortresses. Plain data.
 *
 * - Tiles: our `.map` files paint the fortress floor with slot 14, `ExtTile01` (the `ExtTile` loop
 *   after Rock07, MapManager.cpp:1452-1459). Slots the folder has no file for name one it has, so
 *   slot 14 keeps its index; the map paints none of them.
 * - Lorencia's fort models are `Object1/Fort01-19.bmd` in the slots its own list leaves free
 *   (`ReforgeMaps.cpp` `LorenciaFortModelSlots`). Noria's are `Object4/Object51-78.bmd`, types
 *   50-77, which the generic `Object<type + 1>` name already finds.
 * - Seats and the candelabra flame: `ReforgeFortObjects.cpp` `Furniture` (`SetUp`, `IsSeat`): the
 *   council chair and the hall chair and bench are seats facing the object's way, the candelabra's
 *   mesh 1 is drawn additive.
 */
import { ENUM_WORLD } from '@/core/types';
import type { MapOverride } from '@/controllers/maps/layer';
import { ROCK02_TILES } from '../../shared/maps/recipes';
import { sit } from '../../shared/maps/shared/terrain';

/** `ExtTile01`, slot 14. */
const EXT_TILE = 'ExtTile01';

/** `LorenciaFortModelSlots`, in the order of Fort01..Fort19.bmd. */
export const LORENCIA_FORT_SLOTS: readonly number[] = [
  104, 112, 113, 114, 134, 135, 136, 137, 138, 139, 147, 148, 149, 157, 158, 159, 154, 155, 156,
];

/** `Furniture` rows: council chair, hall chair, hall bench, hall candelabra. */
const FURNITURE = {
  lorencia: { castleChair: 159, hallChair: 154, hallBench: 155, hallCandelabra: 156 },
  noria: { castleChair: 71, hallChair: 75, hallBench: 76, hallCandelabra: 77 },
} as const;

/** `CandelabraFlameMesh`. */
const CANDELABRA_FLAME_MESH = 1;

function fortRows(f: (typeof FURNITURE)[keyof typeof FURNITURE]): MapOverride {
  return {
    blendMeshes: { [f.hallCandelabra]: CANDELABRA_FLAME_MESH },
    terrain: {
      rest: { [f.castleChair]: sit(true), [f.hallChair]: sit(true), [f.hallBench]: sit(true) },
    },
  };
}

const LORENCIA: MapOverride = {
  // Slots 9-13 (Rock03-07) are not in Season 6's World1 and our map paints none of them.
  tiles: [...ROCK02_TILES, ...Array<string>(5).fill('TileRock02'), EXT_TILE],
  objectModels: Object.fromEntries(
    LORENCIA_FORT_SLOTS.map((slot, i) => [slot, `Fort${String(i + 1).padStart(2, '0')}.glb`])
  ),
  ...fortRows(FURNITURE.lorencia),
};

const NORIA: MapOverride = {
  // Season 6's Noria list (World4 has no Grass02, Ground02 or Rock05-07), then ExtTile01.
  tiles: [
    'TileGrass01',
    'TileGrass01',
    'TileGround01',
    'TileGround01',
    'TileGround03',
    'TileWater01',
    'TileWood01',
    'TileRock01',
    'TileRock02',
    'TileRock03',
    'TileRock04',
    'TileRock04',
    'TileRock04',
    'TileRock04',
    EXT_TILE,
  ],
  ...fortRows(FURNITURE.noria),
};

export const REFORGE_MAPS: Readonly<Partial<Record<number, MapOverride>>> = {
  [ENUM_WORLD.WD_0LORENCIA]: LORENCIA,
  [ENUM_WORLD.WD_3NORIA]: NORIA,
};
