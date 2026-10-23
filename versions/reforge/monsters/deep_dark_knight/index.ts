import { defineMonster } from '@/controllers/monsters';

/** Deep Dark Knight, server 712: the stock monster model 3 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 712,
  Name: 'Deep Dark Knight',
  maxHealth: 1_900_000,
  model: { type: 3, scale: 1.4 },
});
