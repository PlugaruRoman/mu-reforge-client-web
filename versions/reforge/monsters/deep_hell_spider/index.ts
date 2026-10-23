import { defineMonster } from '@/controllers/monsters';

/** Deep Hell Spider, server 709: the stock monster model 8 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 709,
  Name: 'Deep Hell Spider',
  maxHealth: 990_000,
  model: { type: 8, scale: 1.3 },
});
