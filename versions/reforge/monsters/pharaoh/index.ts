import { defineMonster } from '@/controllers/monsters';

/** Pharaoh, server 611: our own art, Data/Monster/Monster237.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 611,
  Name: 'Pharaoh',
  maxHealth: 244_800_000,
  model: { type: 236, scale: 1.6 },
});
