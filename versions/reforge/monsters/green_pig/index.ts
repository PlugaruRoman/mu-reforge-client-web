import { defineMonster } from '@/controllers/monsters';

/** Green Pig, server 755: our own art, Data/Monster/Monster342.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 755,
  Name: 'Green Pig',
  maxHealth: 520_000,
  model: { type: 341, scale: 1 },
});
