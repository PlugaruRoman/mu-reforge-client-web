import { defineMonster } from '@/controllers/monsters';

/** Purple Monkey, server 753: our own art, Data/Monster/Monster340.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 753,
  Name: 'Purple Monkey',
  maxHealth: 1_720_000,
  model: { type: 339, scale: 1.1 },
});
