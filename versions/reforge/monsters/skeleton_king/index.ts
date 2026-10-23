import { defineMonster } from '@/controllers/monsters';

/** Skeleton King, server 612: our own art, Data/Monster/Monster238.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 612,
  Name: 'Skeleton King',
  maxHealth: 37_400_000,
  model: { type: 237, scale: 165 },
  // The pack was exported in metres, not MU units: 100 times the usual boss scale.
});
