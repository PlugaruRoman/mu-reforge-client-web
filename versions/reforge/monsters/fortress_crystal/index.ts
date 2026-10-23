import { defineMonster } from '@/controllers/monsters';

/** Fortress Crystal, server 769: the stock monster model 86 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 769,
  Name: 'Fortress Crystal',
  model: { type: 86, scale: 1 },
  npc: true,
  // The castle's Life Stone, its mesh 3 glowing, without a shadow (ReforgeMonsterFactory.cpp FortressCrystal;
  // its MODEL_AURORA is not drawn here).
  classicShadow: false,
  blendMesh: { mesh: 3 },
});
