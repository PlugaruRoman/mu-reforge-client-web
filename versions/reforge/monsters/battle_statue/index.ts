import { defineMonster } from '@/controllers/monsters';

/** Battle Statue, server 650: our own art, Data/Monster/Monster284.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 650,
  Name: 'Battle Statue',
  model: { type: 283, scale: 1.3 },
  npc: true,
  // The Olympiad statue; its model has a single action.
});
