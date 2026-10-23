import { defineMonster } from '@/controllers/monsters';

/** Abyss Bahamut, server 714: our own art, Data/Monster/Monster301.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 714,
  Name: 'Abyss Bahamut',
  maxHealth: 84_000,
  model: { type: 300, scale: 1.3 },
});
