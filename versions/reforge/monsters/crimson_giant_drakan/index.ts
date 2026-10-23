import { defineMonster } from '@/controllers/monsters';

/** Crimson Giant Drakan, server 730: our own art, Data/Monster/Monster317.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 730,
  Name: 'Crimson Giant Drakan',
  maxHealth: 170_000,
  model: { type: 316, scale: 1.15 },
});
