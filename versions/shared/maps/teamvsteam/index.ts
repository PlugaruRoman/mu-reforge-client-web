import { ENUM_WORLD } from '@/core/types';
import type { MapLayer } from '@/controllers/maps/layer';
import { FULL_TILES } from '../recipes';

/**
 * Team vs Team (World88 / Object88): Mu Reforge only, server map 87, reached through the event
 * alone (our client's World/Reforge/ReforgeMaps.h). Our client draws it with no case of its own:
 * plain objects, the default light and sound, so this entry is tiles only. Its art ships in
 * `public/game-assets-reforge/` (versions/reforge/data).
 */
export const teamvsteamLayer: MapLayer = {
  name: 'teamvsteam',
  worlds: [ENUM_WORLD.WD_87TEAM_VS_TEAM],
  // EncTerrain88.map indexes slots 0-13; World88 has every one of them.
  tiles: FULL_TILES,
};
