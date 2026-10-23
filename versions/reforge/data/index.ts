/**
 * Where the Mu Reforge assets live: Season 6's trees, plus two small trees of our own that hold
 * only what our client (mu-reforge-client-next, `src/bin/Data`) has and Season 6 does not.
 *
 * - `assets` (`public/game-assets-reforge/`, `assets.ts`): our item models (`Item/`, `Player/`), our monster art (Monster218-349), the
 *   Team vs Team and Deep Dungeon worlds (World88, World91-95) and their objects, and the Arena's
 *   walk map (our `EncTerrain7.att` opens 118 cells). Every other converted file is Season 6's.
 * - `folder` (`Data-reforge/`, `inventory.ts`): our warp list (`MoveReq_eng.bmd`), our NPC names
 *   (`NpcName_Eng.txt` with `NpcName_Reforge_Eng.txt` appended), the minimaps and name banners of our
 *   worlds and the Hero Cape's cloth texture.
 *   Every other original file is read from Season 6's `Data/` (`folderPaths: ['']`).
 */
import type { VersionData } from '@/version/contract';
import { season6Data } from '../../season6/data';
import { REFORGE_ASSET_FILES } from './assets';
import { REFORGE_DATA_FILES } from './inventory';

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export const reforgeData: VersionData = {
  ...season6Data,
  folder: withTrailingSlash(import.meta.env.VITE_DATA_URL_REFORGE || './Data-reforge/'),
  assets: './game-assets-reforge/',
  // Season 6's worlds, plus Team vs Team (World88) and the Deep Dungeon floors (World91-95).
  worlds: [...season6Data.worlds, 88, 91, 92, 93, 94, 95],
  inventory: new Set(REFORGE_DATA_FILES),
  borrows: {
    assets: season6Data.assets,
    ownAssets: new Set(REFORGE_ASSET_FILES),
    folder: season6Data.folder,
    // Every original file our tree does not hold is Season 6's.
    folderPaths: [''],
  },
};
