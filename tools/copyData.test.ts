import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { shipsDataFile, shipsWhole } from './copyData';
import { REFORGE_DATA_FILES } from '../versions/reforge/data/inventory';

/** The sprites a registry names: each is fetched from Data/ at run time. */
function namedDataFiles(registry: string): string[] {
  const text = readFileSync(registry, 'utf8');
  return [...new Set([...text.matchAll(/'([A-Za-z0-9]+\/[\w./-]+\.(?:OZJ|OZT))'/g)].map(m => m[1]))].sort();
}

/** Whether Data/ holds the file in this exact case: a case-sensitive host serves only that. */
function inData(rel: string): boolean {
  const at = rel.lastIndexOf('/');
  return readdirSync(`Data/${rel.slice(0, at)}`).includes(rel.slice(at + 1));
}

describe('copyData', () => {
  it('ships every effect texture the client loads', () => {
    const named = namedDataFiles('src/controllers/fx/recipes.ts');
    expect(named.length).toBeGreaterThan(20);
    expect(named.filter(f => !shipsDataFile(f))).toEqual([]);
  });

  it('ships every flare card sheet', () => {
    const named = namedDataFiles('src/controllers/lighting/effectLights.ts');
    expect(named.length).toBeGreaterThan(7);
    expect(named.filter(f => !shipsDataFile(f))).toEqual([]);
  });

  it('ships every bitmap a dropped body part is drawn with', () => {
    const named = namedDataFiles('src/controllers/actors/skinTexture.ts');
    expect(named.length).toBe(20);
    expect(named.filter(f => !inData(f))).toEqual([]);
    expect(named.filter(f => !shipsDataFile(f))).toEqual([]);
  });

  it('ships every layer a wing pass draws with', () => {
    const named = namedDataFiles('src/controllers/actors/wings.ts');
    expect(named).toEqual(['Item/msword01_r.OZJ']);
    expect(named.filter(f => !inData(f))).toEqual([]);
    expect(named.filter(f => !shipsDataFile(f))).toEqual([]);
  });

  it('ships every bitmap a cloak or robe is drawn with', () => {
    const named = [
      ...new Set(
        readdirSync('versions/shared/cloaks')
          .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
          .flatMap(f => namedDataFiles(`versions/shared/cloaks/${f}`))
      ),
    ];
    expect(named.length).toBeGreaterThan(20);
    expect(named.filter(f => !inData(f))).toEqual([]);
    expect(named.filter(f => !shipsDataFile(f))).toEqual([]);
  });

  it('follows the rules', () => {
    expect(shipsDataFile('Skill/magic_a01.OZJ')).toBe(true);
    expect(shipsDataFile('World74/mini_map.OZT')).toBe(true);
    expect(shipsDataFile('World74/EncTerrain74.att')).toBe(false);
    expect(shipsDataFile('gate.bmd')).toBe(true);
  });

  it('ships Data-reforge whole, files the rules would drop included', () => {
    expect(shipsWhole('Data-reforge')).toBe(true);
    expect(shipsWhole('/app/Data-reforge')).toBe(true);
    expect(shipsWhole('Data')).toBe(false);
    expect(shipsWhole('Data-v097d')).toBe(false);
    // Why it is copied whole: the Hero Cape's cloth is in no rule.
    expect(REFORGE_DATA_FILES).toContain('item/cape_bronze25_0.ozt');
    expect(shipsDataFile('Item/Cape_Bronze25_0.OZT')).toBe(false);
  });
});
