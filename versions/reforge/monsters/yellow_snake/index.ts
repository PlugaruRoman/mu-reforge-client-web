import { defineMonster } from '@/controllers/monsters';

/** Yellow Snake, server 736: our own art, Data/Monster/Monster323.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 736,
  Name: 'Yellow Snake',
  maxHealth: 590_000,
  model: { type: 322, scale: 0.55 },
});
