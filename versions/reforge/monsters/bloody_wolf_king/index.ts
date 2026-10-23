import { defineMonster } from '@/controllers/monsters';

/** Bloody Wolf King, server 721: our own art, Data/Monster/Monster308.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 721,
  Name: 'Bloody Wolf King',
  maxHealth: 105_000,
  model: { type: 307, scale: 1.7 },
});
