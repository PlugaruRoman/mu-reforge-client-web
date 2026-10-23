import { defineMonster } from '@/controllers/monsters';

/** Blue Alien, server 607: our own art, Data/Monster/Monster233.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 607,
  Name: 'Blue Alien',
  maxHealth: 136_000_000,
  model: { type: 232, scale: 1.6 },
});
