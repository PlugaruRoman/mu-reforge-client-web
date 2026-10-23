import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's Team vs Team (C1 E2).
export default defineModule({
  id: 'tvt',
  install: installNet,
});
