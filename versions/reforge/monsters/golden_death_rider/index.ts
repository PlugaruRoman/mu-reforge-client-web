import { defineMonster } from '@/controllers/monsters';

/** Golden Death Rider, server 760: the stock monster model 102 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 760,
  Name: 'Golden Death Rider',
  maxHealth: 600_000,
  model: { type: 102, scale: 1.2 },
  // Drawn with the classic golden pass (Golden in ReforgeMonsters.cpp): its class is in
  // versions/shared/monsters/_golden_line/model.ts.
});
