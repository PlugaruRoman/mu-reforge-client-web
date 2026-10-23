import { registerMonsters, type MonsterDef } from '@/controllers/monsters';

/**
 * Mu Reforge's own monsters and NPCs (`<name>/index.ts`, one per server number), the rows of our
 * client's `World/Reforge/ReforgeMonsters.cpp`. Imported by `../index.ts` after Season 6's, so a
 * number both know (523, the Imperial Guardian trap) takes ours. Found by glob in the client build
 * and in tests, read from disk by the Bun servers (no Vite there), as `versions/shared/monsters/all.ts`.
 */
function monsterFiles(): MonsterDef[] {
  try {
    return Object.values(import.meta.glob<MonsterDef>('./*/index.ts', { eager: true, import: 'default' }));
  } catch {
    // Bun only: `require` loads TypeScript synchronously, and node:fs never reaches the browser bundle.
    const { existsSync, readdirSync } = require('node:fs') as typeof import('node:fs');
    const here = import.meta.dir;
    return readdirSync(here, { withFileTypes: true })
      .filter(d => d.isDirectory() && existsSync(`${here}/${d.name}/index.ts`))
      .map(d => require(`${here}/${d.name}/index.ts`).default as MonsterDef);
  }
}

/** Our monster folders, for tests and tools. */
export const reforgeMonsters: readonly MonsterDef[] = monsterFiles();

registerMonsters(reforgeMonsters);
