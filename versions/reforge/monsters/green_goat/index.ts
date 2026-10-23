import { defineMonster } from '@/controllers/monsters';

/** Green Goat, server 743: our own art, Data/Monster/Monster330.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 743,
  Name: 'Green Goat',
  maxHealth: 260_000,
  model: { type: 329, scale: 0.75 },
});
