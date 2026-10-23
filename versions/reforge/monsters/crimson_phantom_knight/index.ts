import { defineMonster } from '@/controllers/monsters';

/** Crimson Phantom Knight, server 729: our own art, Data/Monster/Monster316.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 729,
  Name: 'Crimson Phantom Knight',
  maxHealth: 160_000,
  model: { type: 315, scale: 1.4 },
});
