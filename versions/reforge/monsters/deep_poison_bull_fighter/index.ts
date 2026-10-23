import { defineMonster } from '@/controllers/monsters';

/** Deep Poison Bull Fighter, server 711: the stock monster model 0 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 711,
  Name: 'Deep Poison Bull Fighter',
  maxHealth: 1_500_000,
  model: { type: 0, scale: 1.4 },
});
