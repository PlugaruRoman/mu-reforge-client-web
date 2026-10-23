import { defineMonster } from '@/controllers/monsters';

/** Roshan, server 609: our own art, Data/Monster/Monster235.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 609,
  Name: 'Roshan',
  maxHealth: 136_000_000,
  model: { type: 234, scale: 1.6 },
});
