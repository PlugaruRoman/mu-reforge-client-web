import { defineMonster } from '@/controllers/monsters';

/** Deep Hell Hound, server 708: the stock monster model 1 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 708,
  Name: 'Deep Hell Hound',
  maxHealth: 700_000,
  model: { type: 1, scale: 1.3 },
});
