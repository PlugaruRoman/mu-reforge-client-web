import { defineMonster } from '@/controllers/monsters';

/** Bloody Mutant, server 720: our own art, Data/Monster/Monster307.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 720,
  Name: 'Bloody Mutant',
  maxHealth: 100_000,
  model: { type: 306, scale: 1.3 },
});
