import { defineMonster } from '@/controllers/monsters';

/** Harpy Queen, server 610: our own art, Data/Monster/Monster236.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 610,
  Name: 'Harpy Queen',
  maxHealth: 136_000_000,
  model: { type: 235, scale: 2.9 },
});
