import { defineMonster } from '@/controllers/monsters';

/** Red Goat, server 746: our own art, Data/Monster/Monster333.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 746,
  Name: 'Red Goat',
  maxHealth: 2_450_000,
  model: { type: 332, scale: 0.95 },
});
