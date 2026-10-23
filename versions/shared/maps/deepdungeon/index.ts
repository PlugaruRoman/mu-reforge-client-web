import { ENUM_WORLD } from '@/core/types';
import type { MapLayer } from '@/controllers/maps/layer';
import { ROCK02_TILES } from '../recipes';

/**
 * Deep Dungeon floors 1, 2 and 5 (World91, World92, World95): Mu Reforge only, server maps 90, 91
 * and 94, entered through the Dungeon Guide in Lorencia (our client's World/Reforge/ReforgeMaps.h).
 * Our client draws them with no case of their own: plain objects, the default light and sound.
 * Their art ships in `public/game-assets-reforge/` (versions/reforge/data); each floor reads its
 * own folder (`world + 1`). Floors 3 and 4 index more tile slots: `../deepdungeonlower`.
 */
export const deepdungeonLayer: MapLayer = {
  name: 'deepdungeon',
  worlds: [ENUM_WORLD.WD_90DEEP_DUNGEON1, ENUM_WORLD.WD_91DEEP_DUNGEON2, ENUM_WORLD.WD_94DEEP_DUNGEON5],
  // Their EncTerrain<n>.map index slots 0-8 only (Rock01-02).
  tiles: ROCK02_TILES,
  create: world => import('./create').then(m => m.createDeepDungeon(world)),
};
