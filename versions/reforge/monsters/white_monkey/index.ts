import { defineMonster } from '@/controllers/monsters';

/** White Monkey, server 752: our own art, Data/Monster/Monster339.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 752,
  Name: 'White Monkey',
  maxHealth: 920_000,
  model: { type: 338, scale: 1.05 },
});
