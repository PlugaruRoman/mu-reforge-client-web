import { defineMonster } from '@/controllers/monsters';

/** Blue Pig, server 756: our own art, Data/Monster/Monster343.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 756,
  Name: 'Blue Pig',
  maxHealth: 1_050_000,
  model: { type: 342, scale: 1.05 },
});
