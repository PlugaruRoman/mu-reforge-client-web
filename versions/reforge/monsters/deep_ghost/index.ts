import { defineMonster } from '@/controllers/monsters';

/** Deep Ghost, server 707: the stock monster model 7 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 707,
  Name: 'Deep Ghost',
  maxHealth: 560_000,
  model: { type: 7, scale: 1.3 },
});
