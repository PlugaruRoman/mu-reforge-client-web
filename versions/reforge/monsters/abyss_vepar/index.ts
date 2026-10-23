import { defineMonster } from '@/controllers/monsters';

/** Abyss Vepar, server 715: our own art, Data/Monster/Monster302.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 715,
  Name: 'Abyss Vepar',
  maxHealth: 85_000,
  model: { type: 301, scale: 1.2 },
});
