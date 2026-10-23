import { defineMonster } from '@/controllers/monsters';

/** Red Snake, server 738: our own art, Data/Monster/Monster325.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 738,
  Name: 'Red Snake',
  maxHealth: 2_120_000,
  model: { type: 324, scale: 0.7 },
});
