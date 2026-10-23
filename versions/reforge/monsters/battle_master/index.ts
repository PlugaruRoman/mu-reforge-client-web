import { defineMonster } from '@/controllers/monsters';

/** Battle Master, server 765: our own art, Data/Monster/Monster348.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 765,
  Name: 'Battle Master',
  model: { type: 347, scale: 90 },
  npc: true,
  // Authored about 2.5 units tall: the pack's "scale 90" is a factor, not 90 percent.
});
