import { defineMonster } from '@/controllers/monsters';

/** White Rooster, server 748: our own art, Data/Monster/Monster335.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 748,
  Name: 'White Rooster',
  maxHealth: 830_000,
  model: { type: 334, scale: 1.05 },
});
