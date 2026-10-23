import { defineMonster } from '@/controllers/monsters';

/** Red Monkey, server 754: our own art, Data/Monster/Monster341.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 754,
  Name: 'Red Monkey',
  maxHealth: 2_950_000,
  model: { type: 340, scale: 1.2 },
});
