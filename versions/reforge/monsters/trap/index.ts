import { defineMonster } from '@/controllers/monsters';

/** Trap, server 523: no character (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 523,
  Name: 'Trap',
  maxHealth: 4500,
  // Spawned for the server's rules only: the player sees the map's own spike plates.
  hidden: true,
});
