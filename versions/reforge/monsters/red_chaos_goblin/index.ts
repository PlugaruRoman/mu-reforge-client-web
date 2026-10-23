import { defineMonster } from '@/controllers/monsters';

/** Red Chaos Goblin, server 742: our own art, Data/Monster/Monster329.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 742,
  Name: 'Red Chaos Goblin',
  maxHealth: 2_320_000,
  model: { type: 328, scale: 0.9 },
});
