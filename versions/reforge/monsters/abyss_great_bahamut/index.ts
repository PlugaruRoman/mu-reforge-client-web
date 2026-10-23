import { defineMonster } from '@/controllers/monsters';

/** Abyss Great Bahamut, server 716: our own art, Data/Monster/Monster303.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 716,
  Name: 'Abyss Great Bahamut',
  maxHealth: 86_000,
  model: { type: 302, scale: 1.5 },
});
