import { defineModule } from '../module';
import { setMixAdjuster } from '../chaos_mix/mixRecipes';
import { Hero } from '@/modules/hero';
import { REFORGE_MIX, recipeAllowedFor } from './recipes';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's Chaos Machine recipes.
export default defineModule({
  id: 'reforge_mix',
  requires: ['chaos_mix'],
  // The Divine Horse mix (119) for the Dark Lord alone (`recipeAllowedFor`).
  install: () => setMixAdjuster({ ...REFORGE_MIX, allowed: r => recipeAllowedFor(r, Hero.charClass) }),
});
