import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's Fortress of Imperial Guardian timer (C1 F7 02/04/06).
export default defineModule({
  id: 'imperial_guardian',
  install: installNet,
});
