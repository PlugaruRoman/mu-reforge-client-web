import { existsSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { monsterRegistry } from '@/controllers/monsters';
import { monsterModelFile } from '@/controllers/actors/monsterModelTable';
import { isKnownObjectType, resolveModelFactory } from '@/controllers/actors/modelFactoryPerId';
import { reforgeMonsters } from './all';

const ROOT = resolve(__dirname, '../../..');

/**
 * Our client's table (mu-reforge-client-next, World/Reforge/ReforgeMonsters.cpp): 78 rows, 57 of
 * them drawn from our own art (`Monster<file>.bmd`, loaded into slot `file - 1`).
 */
describe('reforge monsters', () => {
  it('has every row of our client table', () => {
    const numbers = reforgeMonsters.map(m => m.Numb).sort((a, b) => a - b);
    expect(numbers).toHaveLength(78);
    expect(numbers.slice(0, 4)).toEqual([523, 600, 601, 602]);
    expect(numbers).not.toContain(731);
    expect(numbers).not.toContain(764);
    expect(numbers.at(-1)).toBe(769);
  });

  it('draws our own art from the converted tree', () => {
    const own = reforgeMonsters.filter(m => m.model && m.model.type >= 217);
    expect(own).toHaveLength(57);
    const missing = own
      .flatMap(m => (m.model ? [monsterModelFile(m.model.type)] : []))
      .filter(file => !existsSync(resolve(ROOT, 'public/game-assets-reforge', file)));
    expect(missing).toEqual([]);
  });

  it('keeps our client scale and model', () => {
    expect(monsterRegistry.model(603)).toEqual({ type: 217, scale: 1.7 });
    expect(monsterRegistry.model(612)).toEqual({ type: 237, scale: 165 });
    expect(monsterRegistry.model(604)).toEqual({ type: 64, scale: 1.8 });
    expect(monsterRegistry.model(765)).toEqual({ type: 347, scale: 90 });
  });

  it('marks the NPCs talkable and hides the trap', () => {
    const npcs = reforgeMonsters.filter(m => m.npc).map(m => m.Numb).sort((a, b) => a - b);
    expect(npcs).toEqual([650, 763, 765, 766, 767, 769]);
    expect(monsterRegistry.def(523)?.hidden).toBe(true);
  });

  it('resolves every number the scope packet brings to its own body, never the Bull Fighter fallback', () => {
    const fallback = resolveModelFactory(-1);
    const unresolved = reforgeMonsters.filter(m => !isKnownObjectType(m.Numb) || (!m.hidden && resolveModelFactory(m.Numb) === fallback));
    expect(unresolved.map(m => m.Numb)).toEqual([]);
    // The rows that reuse a stock body find it in Season 6's tree.
    const stock = reforgeMonsters
      .flatMap(m => (m.model && m.model.type < 217 ? [monsterModelFile(m.model.type)] : []))
      .filter(file => !existsSync(resolve(ROOT, 'public/game-assets', file)));
    expect(stock).toEqual([]);
  });

  it('names every type, with or without a language pack', () => {
    for (const m of reforgeMonsters) expect(monsterRegistry.def(m.Numb)?.Name).toBe(m.Name);
  });
});
