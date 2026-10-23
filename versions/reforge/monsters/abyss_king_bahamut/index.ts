import { defineMonster } from '@/controllers/monsters';

/** Abyss King Bahamut, server 718: our own art, Data/Monster/Monster305.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 718,
  Name: 'Abyss King Bahamut',
  maxHealth: 91_000,
  model: { type: 304, scale: 1.7 },
});
