import { defineMonster } from '@/controllers/monsters';

/** Abyss Valkyrie, server 717: our own art, Data/Monster/Monster304.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 717,
  Name: 'Abyss Valkyrie',
  maxHealth: 90_000,
  model: { type: 303, scale: 1.3 },
});
