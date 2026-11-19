import { defineMonster } from '@/controllers/monsters';

/** Boss Training Dummy, server 772: our own art, Data/Monster/Monster351.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 772,
  Name: 'Boss Training Dummy',
  maxHealth: 2_000_000_000,
  model: { type: 350, scale: 1.0 },
  helperIgnores: true,
  // A training dummy on the Arena (server TrainingDummies.cs), with the defense, damage reduction and
  // resistances of a tier 4 raid boss. It never moves, fights back or dies: the server keeps it at full
  // health and writes the damage per second into the chat.
});
