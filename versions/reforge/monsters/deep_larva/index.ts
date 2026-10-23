import { defineMonster } from '@/controllers/monsters';

/** Deep Larva, server 705: the stock monster model 6 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 705,
  Name: 'Deep Larva',
  maxHealth: 210_000,
  model: { type: 6, scale: 1.2 },
});
