import { defineMonster } from '@/controllers/monsters';

/** Abyss Lizard King, server 719: our own art, Data/Monster/Monster306.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 719,
  Name: 'Abyss Lizard King',
  maxHealth: 97_000,
  model: { type: 305, scale: 1.6 },
});
