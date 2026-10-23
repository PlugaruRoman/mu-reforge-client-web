import { defineMonster } from '@/controllers/monsters';

/** Dungeon Guide, server 766: our own art, Data/Monster/Monster349.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 766,
  Name: 'Dungeon Guide',
  model: { type: 348, scale: 90 },
  npc: true,
  // Authored about 2.5 units tall: the pack's "scale 90" is a factor, not 90 percent.
});
