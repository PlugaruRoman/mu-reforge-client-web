import { defineMonster } from '@/controllers/monsters';

/** Anubis, server 605: our own art, Data/Monster/Monster221.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 605,
  Name: 'Anubis',
  maxHealth: 37_400_000,
  model: { type: 220, scale: 1.7 },
});
