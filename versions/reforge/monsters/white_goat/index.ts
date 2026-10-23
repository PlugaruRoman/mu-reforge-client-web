import { defineMonster } from '@/controllers/monsters';

/** White Goat, server 744: our own art, Data/Monster/Monster331.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 744,
  Name: 'White Goat',
  maxHealth: 740_000,
  model: { type: 330, scale: 0.8 },
});
