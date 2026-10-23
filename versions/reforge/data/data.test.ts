import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { assetUrl } from '@/controllers/assets/resolveUrlToDataFolder';
import { dataUrl, hasData } from '@/controllers/assets/mu/dataFolder';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';
import { REFORGE_ASSET_FILES } from './assets';
import { REFORGE_DATA_FILES } from './inventory';
import { reforgeData } from '.';

const ROOT = resolve(__dirname, '../../..');

function walk(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return walk(join(dir, entry.name), rel);
    return entry.name.endsWith('.gz') ? [] : [rel];
  });
}

const OUR_WORLDS = [
  ENUM_WORLD.WD_87TEAM_VS_TEAM,
  ENUM_WORLD.WD_90DEEP_DUNGEON1,
  ENUM_WORLD.WD_91DEEP_DUNGEON2,
  ENUM_WORLD.WD_92DEEP_DUNGEON3,
  ENUM_WORLD.WD_93DEEP_DUNGEON4,
  ENUM_WORLD.WD_94DEEP_DUNGEON5,
];

describe('reforge data', () => {
  const assets = walk(join(ROOT, 'public/game-assets-reforge'));

  it('lists exactly what its two trees hold', () => {
    expect([...REFORGE_ASSET_FILES].sort()).toEqual(assets.map(f => f.toLowerCase()).sort());
    expect([...REFORGE_DATA_FILES].sort()).toEqual(walk(join(ROOT, 'Data-reforge')).map(f => f.toLowerCase()).sort());
  });

  it('reads its own files from its trees and every other one from Season 6', () => {
    expect(assetUrl(reforgeData, 'Monster/Monster218.glb')).toBe('./game-assets-reforge/Monster/Monster218.glb');
    expect(assetUrl(reforgeData, 'World7/EncTerrain7.att')).toBe('./game-assets-reforge/World7/EncTerrain7.att');
    expect(assetUrl(reforgeData, 'World7/EncTerrain7.map')).toBe('./game-assets/World7/EncTerrain7.map');
    expect(assetUrl(reforgeData, 'Monster/Monster01.glb')).toBe('./game-assets/Monster/Monster01.glb');
    expect(dataUrl(reforgeData, 'Local/Eng/MoveReq_eng.bmd')).toBe('./Data-reforge/Local/Eng/MoveReq_eng.bmd');
    expect(dataUrl(reforgeData, 'World88/mini_map.OZT')).toBe('./Data-reforge/World88/mini_map.OZT');
    expect(dataUrl(reforgeData, 'Local/Eng/ImgsMapName/TeamVsTeam.OZT')).toBe('./Data-reforge/Local/Eng/ImgsMapName/TeamVsTeam.OZT');
    expect(dataUrl(reforgeData, 'Local/Eng/ImgsMapName/DeepDungeon5.OZT')).toBe('./Data-reforge/Local/Eng/ImgsMapName/DeepDungeon5.OZT');
    expect(assetUrl(reforgeData, 'Item/HeroBow.glb')).toBe('./game-assets-reforge/Item/HeroBow.glb');
    expect(assetUrl(reforgeData, 'Item/Sword01.glb')).toBe('./game-assets/Item/Sword01.glb');
    expect(dataUrl(reforgeData, 'gate.bmd')).toBe('./Data/gate.bmd');
    expect(hasData(reforgeData, 'Interface/newui_menu01.OZJ')).toBe(true);
  });

  it('offers our worlds besides Season 6 ones', () => {
    for (const world of OUR_WORLDS) expect(reforgeData.worlds).toContain(maps.assetWorldNum(world));
  });

  // One 404 rejects the whole terrain download (getTerrainData.ts): every file a world loads exists,
  // spelled the way the loader asks for it.
  it('has every terrain file and tile its worlds load', () => {
    const have = new Set(assets);
    const missing: string[] = [];
    for (const world of OUR_WORLDS) {
      const n = maps.assetWorldNum(world);
      const files = [`EncTerrain${n}.att`, 'TerrainHeight.OZB', `EncTerrain${n}.map`, 'TerrainLight.OZJ', `EncTerrain${n}.obj`];
      for (const file of [...files, ...maps.tiles(world).map(tile => `${tile}.OZJ`)]) {
        if (!have.has(`World${n}/${file}`)) missing.push(`World${n}/${file}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
