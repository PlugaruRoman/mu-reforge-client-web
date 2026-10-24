import { afterEach, describe, expect, it } from 'vitest';
import type { ENUM_WORLD } from '../../core/types';
import { forWorld, maps, type MapLayer } from './index';

// Two worlds no real entry claims, served by one test entry.
const A = 200 as ENUM_WORLD;
const B = 201 as ENUM_WORLD;

const entry = (over: Partial<MapLayer> = {}): MapLayer => ({
  name: 'zzTest',
  worlds: [A, B],
  tiles: [],
  ...over,
});

let unregister: (() => void) | null = null;
afterEach(() => {
  unregister?.();
  unregister = null;
});

describe('a map row', () => {
  it('is one value for every world the entry serves', () => {
    unregister = maps.register(entry({ sound: { music: 'Music/Noria' } }));
    expect(maps.rowFor(A, l => l.sound?.music)).toBe('Music/Noria');
    expect(maps.rowFor(B, l => l.sound?.music)).toBe('Music/Noria');
  });

  it('can differ per world, and a world left out has none', () => {
    unregister = maps.register(entry({ sound: { music: { byWorld: { [A]: null } } } }));
    expect(maps.rowFor(A, l => l.sound?.music)).toBeNull();
    expect(maps.rowFor(B, l => l.sound?.music)).toBeUndefined();
  });

  it('is undefined where no entry claims the world', () => {
    expect(maps.rowFor(202 as ENUM_WORLD, l => l.sound?.music)).toBeUndefined();
  });

  it('resolves through forWorld the same way', () => {
    expect(forWorld({ byWorld: { [A]: 1 } }, A)).toBe(1);
    expect(forWorld({ byWorld: { [A]: 1 } }, B)).toBeUndefined();
    expect(forWorld(2, B)).toBe(2);
    expect(forWorld<number>(undefined, A)).toBeUndefined();
  });
});

describe('the live views', () => {
  it('a worldSet made before the entry follows register and unregister', () => {
    const wet = maps.worldSet(l => l.weather?.wetGround === true);
    expect(wet.has(A)).toBe(false);

    unregister = maps.register(entry({ weather: { wetGround: true } }));
    expect(wet.has(A)).toBe(true);
    expect([...wet]).toEqual(expect.arrayContaining([A, B]));
    expect(wet.size).toBe([...wet].length);

    unregister();
    unregister = null;
    expect(wet.has(A)).toBe(false);
  });

  it('a worldMap answers only the claimed worlds it has a value for', () => {
    const music = maps.worldMap(w => maps.rowFor(w, l => l.sound?.music) ?? undefined);
    unregister = maps.register(entry({ sound: { music: { byWorld: { [B]: 'Music/Noria' } } } }));
    expect(music.get(B)).toBe('Music/Noria');
    expect(music.has(A)).toBe(false);
    expect(music.get(202 as ENUM_WORLD)).toBeUndefined();
    expect([...music.keys()]).toContain(B);
  });
});

describe("a version's map rows", () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('change only the world they name, merged over the entry', () => {
    unregister = maps.register(
      entry({
        tiles: ['TileGrass01'],
        blendMeshes: { 1: 2 },
        terrain: { rest: { 8: { kind: 'sit', useObjectAngle: false } }, leanCursor: [8] },
      })
    );
    const rows = {
      [A]: {
        tiles: ['TileGrass01', 'ExtTile01'],
        blendMeshes: { 5: 1 },
        terrain: { rest: { 9: { kind: 'sit', useObjectAngle: true } } },
        objectModels: { 4: 'Fort01.glb' },
      },
    } as const;
    restore = maps.useVersionMaps(() => rows);

    expect(maps.tiles(A)).toEqual(['TileGrass01', 'ExtTile01']);
    expect(maps.tiles(B)).toEqual(['TileGrass01']);
    expect(maps.blendMeshFor(A, 1)).toBe(2);
    expect(maps.blendMeshFor(A, 5)).toBe(1);
    expect(maps.blendMeshFor(B, 5)).toBeUndefined();
    const terrain = maps.rowFor(A, l => l.terrain);
    expect(terrain?.rest?.[8]?.useObjectAngle).toBe(false);
    expect(terrain?.rest?.[9]?.useObjectAngle).toBe(true);
    expect(terrain?.leanCursor).toEqual([8]);
    expect(maps.objectModelFor(A, 4)).toBe('Fort01.glb');
    expect(maps.objectModelFor(A, 5)).toBe('Object06.glb');
    expect(maps.objectModelFor(B, 4)).toBe('Object05.glb');
    expect(maps.layerFor(A)).toBe(maps.layerFor(A));
    expect(maps.layerFor(A)?.name).toBe('zzTest');
  });

  it('are absent by default, so every map is its shared entry', () => {
    const shared = entry();
    unregister = maps.register(shared);
    expect(maps.layerFor(A)).toBe(shared);
    expect(maps.objectModelFor(A, 103)).toBe('Object104.glb');
  });
});
