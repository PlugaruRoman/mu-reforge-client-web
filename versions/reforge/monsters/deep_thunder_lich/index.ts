import { defineMonster } from '@/controllers/monsters';

/** Deep Thunder Lich, server 710: the stock monster model 4 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 710,
  Name: 'Deep Thunder Lich',
  maxHealth: 1_250_000,
  model: { type: 4, scale: 1.3 },
});
