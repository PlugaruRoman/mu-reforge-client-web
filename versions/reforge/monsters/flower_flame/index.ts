import { defineMonster } from '@/controllers/monsters';

/** Flower Flame, server 601: the stock monster model 154 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 601,
  Name: 'Flower Flame',
  maxHealth: 4000,
  model: { type: 154, scale: 0.9 },
});
