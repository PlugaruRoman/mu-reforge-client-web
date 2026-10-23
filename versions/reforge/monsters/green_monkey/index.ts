import { defineMonster } from '@/controllers/monsters';

/** Green Monkey, server 751: our own art, Data/Monster/Monster338.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 751,
  Name: 'Green Monkey',
  maxHealth: 320_000,
  model: { type: 337, scale: 1 },
});
