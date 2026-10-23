import { defineMonster } from '@/controllers/monsters';

/** Purple Goat, server 745: our own art, Data/Monster/Monster332.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 745,
  Name: 'Purple Goat',
  maxHealth: 1_470_000,
  model: { type: 331, scale: 0.85 },
});
