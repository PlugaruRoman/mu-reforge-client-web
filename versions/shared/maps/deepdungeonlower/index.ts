import { ENUM_WORLD } from '@/core/types';
import type { MapLayer } from '@/controllers/maps/layer';
import { FULL_TILES } from '../recipes';

/**
 * Deep Dungeon floors 3 and 4 (World93, World94; server maps 92, 93): the floors of `../deepdungeon`
 * whose maps also index slots 9-11 and `LoadWorld`'s `ExtTile01/02`, slots 14-15
 * (MapManager.cpp:1451-1459). Slot 11 (`TileRock05`) is in neither folder (unbound in our client):
 * Rock04 stands in, as on Balgas Refuge.
 */
const TILES: readonly string[] = [
  ...FULL_TILES.slice(0, 11),
  'TileRock04',
  'TileRock06',
  'TileRock07',
  'ExtTile01',
  'ExtTile02',
];

export const deepdungeonlowerLayer: MapLayer = {
  name: 'deepdungeonlower',
  worlds: [ENUM_WORLD.WD_92DEEP_DUNGEON3, ENUM_WORLD.WD_93DEEP_DUNGEON4],
  tiles: TILES,
  create: world => import('../deepdungeon/create').then(m => m.createDeepDungeon(world)),
};
