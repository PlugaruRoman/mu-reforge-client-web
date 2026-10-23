import { defineMonster } from '@/controllers/monsters';

/** Deep Gorgon, server 713: the stock monster model 11 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 713,
  Name: 'Deep Gorgon',
  maxHealth: 2_600_000,
  model: { type: 11, scale: 1.6 },
});
