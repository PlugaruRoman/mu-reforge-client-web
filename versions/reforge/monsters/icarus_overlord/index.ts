import { defineMonster } from '@/controllers/monsters';

/** Icarus Overlord, server 608: our own art, Data/Monster/Monster234.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 608,
  Name: 'Icarus Overlord',
  maxHealth: 136_000_000,
  model: { type: 233, scale: 1.6 },
});
