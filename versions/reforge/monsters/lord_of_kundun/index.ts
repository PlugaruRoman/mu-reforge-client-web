import { defineMonster } from '@/controllers/monsters';

/** Lord of Kundun, server 604: the stock monster model 64 (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 604,
  Name: 'Lord of Kundun',
  maxHealth: 550_800_000,
  model: { type: 64, scale: 1.8 },
});
