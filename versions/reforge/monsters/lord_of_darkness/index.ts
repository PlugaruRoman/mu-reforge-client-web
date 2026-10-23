import { defineMonster } from '@/controllers/monsters';

/** Lord of Darkness, server 603: our own art, Data/Monster/Monster218.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 603,
  Name: 'Lord of Darkness',
  maxHealth: 37_400_000,
  model: { type: 217, scale: 1.7 },
});
