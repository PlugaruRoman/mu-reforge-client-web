import { defineMonster } from '@/controllers/monsters';

/** Purple Snake, server 737: our own art, Data/Monster/Monster324.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 737,
  Name: 'Purple Snake',
  maxHealth: 1_180_000,
  model: { type: 323, scale: 0.6 },
});
