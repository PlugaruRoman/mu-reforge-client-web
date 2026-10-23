import { defineMonster } from '@/controllers/monsters';

/** Blue Chaos Goblin, server 740: our own art, Data/Monster/Monster327.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 740,
  Name: 'Blue Chaos Goblin',
  maxHealth: 660_000,
  model: { type: 326, scale: 0.75 },
});
