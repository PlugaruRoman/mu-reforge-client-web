import { defineMonster } from '@/controllers/monsters';

/** Green Chaos Goblin, server 739: our own art, Data/Monster/Monster326.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 739,
  Name: 'Green Chaos Goblin',
  maxHealth: 230_000,
  model: { type: 325, scale: 0.7 },
});
