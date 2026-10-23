import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's hunting log (C1 DA 01).
export default defineModule({
  id: 'hunt_log',
  install: installNet,
});
