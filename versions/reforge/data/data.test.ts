import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { assetUrl } from '@/controllers/assets/resolveUrlToDataFolder';
import { dataUrl, hasData } from '@/controllers/assets/mu/dataFolder';
import { ENUM_WORLD } from '@/core/types';
import { maps } from '@/controllers/maps';
import { parseTerrainMapping } from '@/controllers/terrain/parseTerrainMapping';
import { parseTerrainObjects } from '@/controllers/terrain/parseTerrainObjects';
import { LORENCIA_FORT_SLOTS } from '../maps';
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

/** Lorencia and Noria: Season 6's entries with our fortress rows (`../maps`). */
const FORT_WORLDS = [ENUM_WORLD.WD_0LORENCIA, ENUM_WORLD.WD_3NORIA];

describe('reforge data', () => {
  const assets = walk(join(ROOT, 'public/game-assets-reforge'));
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

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

  it('leaves Season 6 Lorencia and Noria tile lists as they were', () => {
    const rock02 = ['TileGrass01', 'TileGrass02', 'TileGround01', 'TileGround02', 'TileGround03', 'TileWater01', 'TileWood01', 'TileRock01', 'TileRock02'];
    expect(maps.tiles(ENUM_WORLD.WD_0LORENCIA)).toEqual(rock02);
    expect(maps.tiles(ENUM_WORLD.WD_3NORIA)).toEqual([
      'TileGrass01', 'TileGrass01', 'TileGround01', 'TileGround01', 'TileGround03', 'TileWater01', 'TileWood01',
      'TileRock01', 'TileRock02', 'TileRock03', 'TileRock04',
    ]);
    expect(maps.objectModelFor(ENUM_WORLD.WD_0LORENCIA, 158)).toBe('Object159.glb');
    expect(maps.layerFor(ENUM_WORLD.WD_0LORENCIA)?.terrain?.rest?.[158]).toBeUndefined();
  });

  it('adds ExtTile01 at slot 14 of Lorencia and Noria, and every slot our maps paint has a tile', async () => {
    restore = maps.useVersionMaps(() => reforgeData.maps);
    for (const world of FORT_WORLDS) {
      const n = maps.assetWorldNum(world);
      const tiles = maps.tiles(world);
      expect(tiles[14]).toBe('ExtTile01');
      const mapping = await parseTerrainMapping(new Uint8Array(readFileSync(join(ROOT, `public/game-assets-reforge/World${n}/EncTerrain${n}.map`))));
      const painted = new Set([...mapping.layer1, ...mapping.layer2.filter(v => v !== 255)]);
      expect([...painted].filter(slot => tiles[slot] === undefined)).toEqual([]);
      expect(painted.has(14)).toBe(true);
    }
  });

  // One 404 rejects the whole terrain download, and a missing model leaves a hole in the fortress.
  it('has every terrain file, tile and object model Lorencia and Noria load, ours or Season 6 ones', () => {
    restore = maps.useVersionMaps(() => reforgeData.maps);
    const own = new Set(REFORGE_ASSET_FILES);
    const season6 = new Set(walk(join(ROOT, 'public/game-assets')).map(f => f.toLowerCase()));
    const missing: string[] = [];
    const need = (file: string) => {
      if (!own.has(file.toLowerCase()) && !season6.has(file.toLowerCase())) missing.push(file);
    };
    for (const world of FORT_WORLDS) {
      const n = maps.assetWorldNum(world);
      for (const file of [`EncTerrain${n}.att`, 'TerrainHeight.OZB', `EncTerrain${n}.map`, 'TerrainLight.OZJ', `EncTerrain${n}.obj`]) {
        expect(own.has(`world${n}/${file}`.toLowerCase()) || file === 'TerrainLight.OZJ').toBe(true);
        need(`World${n}/${file}`);
      }
      for (const tile of maps.tiles(world)) need(`World${n}/${tile}.OZJ`);
      // Noria loads every placed type as `Object<type + 1>`; Lorencia's Season 6 types have classes
      // of their own (`create.ts`), so only its fort slots are named here.
      const objects = parseTerrainObjects(new Uint8Array(readFileSync(join(ROOT, `public/game-assets-reforge/World${n}/EncTerrain${n}.obj`))));
      const placed = new Set(objects.map(o => o.id));
      const types = world === ENUM_WORLD.WD_3NORIA ? placed : LORENCIA_FORT_SLOTS.filter(slot => placed.has(slot));
      for (const type of types) {
        if (maps.isEffectOnly(world, type)) continue;
        need(`Object${n}/${maps.objectModelFor(world, type)}`);
      }
      // Every fort model but Fort10 (slot 139) stands in our EncTerrain1.obj; Fort10.glb is not shipped.
      if (world === ENUM_WORLD.WD_0LORENCIA) {
        expect(LORENCIA_FORT_SLOTS.filter(slot => !placed.has(slot))).toEqual([139]);
      }
    }
    expect(missing).toEqual([]);
  });

  it('places the 19 fort models in their slots and seats the fortress furniture', () => {
    restore = maps.useVersionMaps(() => reforgeData.maps);
    LORENCIA_FORT_SLOTS.forEach((slot, i) => {
      expect(maps.objectModelFor(ENUM_WORLD.WD_0LORENCIA, slot)).toBe(`Fort${String(i + 1).padStart(2, '0')}.glb`);
    });
    for (const type of [159, 154, 155]) expect(maps.layerFor(ENUM_WORLD.WD_0LORENCIA)?.terrain?.rest?.[type]?.kind).toBe('sit');
    for (const type of [71, 75, 76]) expect(maps.layerFor(ENUM_WORLD.WD_3NORIA)?.terrain?.rest?.[type]?.kind).toBe('sit');
    expect(maps.blendMeshFor(ENUM_WORLD.WD_0LORENCIA, 156)).toBe(1);
    expect(maps.blendMeshFor(ENUM_WORLD.WD_3NORIA, 77)).toBe(1);
    // Season 6's own rows stay: the pub seat and the House 03 blend mesh.
    expect(maps.layerFor(ENUM_WORLD.WD_0LORENCIA)?.terrain?.rest?.[146]?.kind).toBe('sit');
    expect(maps.blendMeshFor(ENUM_WORLD.WD_0LORENCIA, 117)).toBe(4);
    expect(maps.layerFor(ENUM_WORLD.WD_3NORIA)?.terrain?.rest?.[38]?.kind).toBe('healing');
  });
});
