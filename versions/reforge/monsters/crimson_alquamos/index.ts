import { defineMonster } from '@/controllers/monsters';

/** Crimson Alquamos, server 725: our own art, Data/Monster/Monster312.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 725,
  Name: 'Crimson Alquamos',
  maxHealth: 130_000,
  model: { type: 311, scale: 1.2 },
});
