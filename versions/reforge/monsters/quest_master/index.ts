import { defineMonster } from '@/controllers/monsters';

/** Quest Master, server 763: our own art, Data/Monster/Monster346.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 763,
  Name: 'Quest Master',
  model: { type: 345, scale: 0.55 },
  npc: true,
  // Captain Slough on the server (Quests.cs QuestNpcNumber); the model is twice a player's height.
});
