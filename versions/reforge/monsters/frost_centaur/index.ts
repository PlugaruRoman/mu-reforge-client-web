import { defineMonster } from '@/controllers/monsters';

/** Frost Centaur, server 734: our own art, Data/Monster/Monster321.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 734,
  Name: 'Frost Centaur',
  maxHealth: 299_200_000,
  model: { type: 320, scale: 1.8 },
});
