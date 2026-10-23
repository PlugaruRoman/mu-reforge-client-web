import { defineMonster } from '@/controllers/monsters';

/** Yellow Chaos Goblin, server 741: our own art, Data/Monster/Monster328.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 741,
  Name: 'Yellow Chaos Goblin',
  maxHealth: 1_320_000,
  model: { type: 327, scale: 0.8 },
});
