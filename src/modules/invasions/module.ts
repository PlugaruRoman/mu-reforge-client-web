import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): the invasion boss status of our server.
export default defineModule({
  id: 'invasions',
  install: installNet,
});
