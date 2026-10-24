import { defineModule } from '../module';
import { setMixAdjuster } from '../chaos_mix/mixRecipes';
import { REFORGE_MIX } from './recipes';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's Chaos Machine recipes.
export default defineModule({
  id: 'reforge_mix',
  requires: ['chaos_mix'],
  install: () => setMixAdjuster(REFORGE_MIX),
});
