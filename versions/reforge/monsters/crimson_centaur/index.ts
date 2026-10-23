import { defineMonster } from '@/controllers/monsters';

/** Crimson Centaur, server 733: our own art, Data/Monster/Monster320.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 733,
  Name: 'Crimson Centaur',
  maxHealth: 299_200_000,
  model: { type: 319, scale: 1.8 },
});
