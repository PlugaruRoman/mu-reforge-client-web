import { defineMonster } from '@/controllers/monsters';

/** Flower Rabbit, server 600: the stock monster model 128 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 600,
  Name: 'Flower Rabbit',
  maxHealth: 4000,
  model: { type: 128, scale: 0.95 },
});
