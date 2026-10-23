import { defineMonster } from '@/controllers/monsters';

/** Red Pig, server 758: our own art, Data/Monster/Monster345.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 758,
  Name: 'Red Pig',
  maxHealth: 3_200_000,
  model: { type: 344, scale: 1.3 },
});
