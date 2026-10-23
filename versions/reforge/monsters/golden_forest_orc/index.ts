import { defineMonster } from '@/controllers/monsters';

/** Golden Forest Orc, server 761: the stock monster model 103 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 761,
  Name: 'Golden Forest Orc',
  maxHealth: 500_000,
  model: { type: 103, scale: 1.25 },
  // Drawn with the classic golden pass (Golden in ReforgeMonsters.cpp): its class is in
  // versions/shared/monsters/_golden_line/model.ts.
});
