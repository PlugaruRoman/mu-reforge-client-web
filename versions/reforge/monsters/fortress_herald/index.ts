import { defineMonster } from '@/controllers/monsters';

/** Fortress Herald, server 767: the stock clerk model (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 767,
  Name: 'Fortress Herald',
  npc: true,
  // Dressed like the castle's Guardsman (MODEL_NPC_CLERK; ReforgeMonsterFactory.cpp FortressHerald).
  npcModel: { file: 'NpcClerk', scale: 1.1 },
});
