import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's Deep Dungeon (C1 E3).
export default defineModule({
  id: 'deep_dungeon',
  install: installNet,
});
