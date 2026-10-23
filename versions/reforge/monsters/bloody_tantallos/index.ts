import { defineMonster } from '@/controllers/monsters';

/** Bloody Tantallos, server 723: our own art, Data/Monster/Monster310.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 723,
  Name: 'Bloody Tantallos',
  maxHealth: 125_000,
  model: { type: 309, scale: 1.4 },
});
