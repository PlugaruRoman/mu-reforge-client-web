import { defineMonster } from '@/controllers/monsters';

/** Training Dummy, server 771: our own art, Data/Monster/Monster351.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 771,
  Name: 'Training Dummy',
  maxHealth: 2_000_000_000,
  model: { type: 350, scale: 1.0 },
  helperIgnores: true,
  // A training dummy on the Arena (server TrainingDummies.cs), no defense: the raw damage of a character. It never moves, fights back or
  // dies: the server keeps it at full health and writes the damage per second into the chat.
});
