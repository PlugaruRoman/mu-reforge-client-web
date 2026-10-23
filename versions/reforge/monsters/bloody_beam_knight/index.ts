import { defineMonster } from '@/controllers/monsters';

/** Bloody Beam Knight, server 722: our own art, Data/Monster/Monster309.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 722,
  Name: 'Bloody Beam Knight',
  maxHealth: 118_000,
  model: { type: 308, scale: 1.5 },
});
