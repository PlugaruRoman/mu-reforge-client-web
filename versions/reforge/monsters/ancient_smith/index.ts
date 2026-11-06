import { defineMonster } from '@/controllers/monsters';

/** Ancient Smith, server 770: our own art, Data/Monster/Monster350.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 770,
  Name: 'Ancient Smith',
  model: { type: 349, scale: 0.95 },
  npc: true,
  // The Lilito "Smith", a replacement of Hanzo's Smith01.bmd, so it takes Hanzo's scale. Talking opens his
  // own chaos machine combinations (modules/reforge_mix).
});
