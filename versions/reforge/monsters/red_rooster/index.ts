import { defineMonster } from '@/controllers/monsters';

/** Red Rooster, server 750: our own art, Data/Monster/Monster337.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 750,
  Name: 'Red Rooster',
  maxHealth: 2_700_000,
  model: { type: 336, scale: 1.2 },
});
