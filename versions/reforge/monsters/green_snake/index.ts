import { defineMonster } from '@/controllers/monsters';

/** Green Snake, server 735: our own art, Data/Monster/Monster322.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 735,
  Name: 'Green Snake',
  maxHealth: 200_000,
  model: { type: 321, scale: 0.5 },
});
