import { defineMonster } from '@/controllers/monsters';

/** Golden Witch Queen, server 759: the stock monster model 100 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 759,
  Name: 'Golden Witch Queen',
  maxHealth: 850_000,
  model: { type: 100, scale: 1.5 },
  // Drawn with the classic golden pass (Golden in ReforgeMonsters.cpp): its class is in
  // versions/shared/monsters/_golden_line/model.ts.
});
