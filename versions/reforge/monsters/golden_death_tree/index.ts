import { defineMonster } from '@/controllers/monsters';

/** Golden Death Tree, server 762: the stock monster model 104 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 762,
  Name: 'Golden Death Tree',
  maxHealth: 450_000,
  model: { type: 104, scale: 1.3 },
  // Drawn with the classic golden pass (Golden in ReforgeMonsters.cpp): its class is in
  // versions/shared/monsters/_golden_line/model.ts.
});
