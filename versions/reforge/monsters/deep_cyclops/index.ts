import { defineMonster } from '@/controllers/monsters';

/** Deep Cyclops, server 706: the stock monster model 10 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 706,
  Name: 'Deep Cyclops',
  maxHealth: 275_000,
  model: { type: 10, scale: 1.4 },
});
