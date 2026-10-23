import { defineMonster } from '@/controllers/monsters';

/** Malgruth, server 606: our own art, Data/Monster/Monster223.bmd (ReforgeMonsters.cpp). */
export default defineMonster({
  Numb: 606,
  Name: 'Malgruth',
  maxHealth: 37_400_000,
  model: { type: 222, scale: 1.7 },
  // The Lord of Kundun pack's look; a pulsing green glow on 17 bones tells it apart (ReforgeMonsterVisuals.cpp
  // MoveMalgruthGlow: BITMAP_SHINY on each bone one frame in three, sin(WorldTime * 0.004) * 0.25 + 0.75,
  // and a terrain light of range 6).
  bodyFx: [
    {
      kind: 'cards',
      spots: [5, 7, 8, 9, 11, 12, 13, 15, 26, 28, 31, 34, 36, 38, 40, 50, 53].map(bone => ({ bone, card: 'shiny2' as const, scale: 0.6 })),
      colour: [0.22, 0.96, 0.1],
      pulse: { speed: 0.004, amount: 0.25, base: 0.75 },
      gate: { alive: true },
    },
  ],
  light: { kind: 'carried', range: 6, color: [0.22, 0.96, 0.1], steady: true },
});
