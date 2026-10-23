import { defineMonster } from '@/controllers/monsters';

/** Demon Bull, server 732: our own art, Data/Monster/Monster319.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 732,
  Name: 'Demon Bull',
  maxHealth: 244_800_000,
  model: { type: 318, scale: 1.5 },
});
