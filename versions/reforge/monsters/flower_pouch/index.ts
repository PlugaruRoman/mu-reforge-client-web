import { defineMonster } from '@/controllers/monsters';

/** Flower Pouch, server 602: the stock monster model 122 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 602,
  Name: 'Flower Pouch',
  maxHealth: 4000,
  model: { type: 122, scale: 0.9 },
});
