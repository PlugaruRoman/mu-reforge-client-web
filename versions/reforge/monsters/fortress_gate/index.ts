import { defineMonster } from '@/controllers/monsters';

/** Fortress Gate, server 768: the stock monster model 73 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 768,
  Name: 'Fortress Gate',
  maxHealth: 2_000_000,
  model: { type: 73, scale: 1 },
  // The castle gate, without a shadow (ReforgeMonsterFactory.cpp FortressGate).
  classicShadow: false,
});
