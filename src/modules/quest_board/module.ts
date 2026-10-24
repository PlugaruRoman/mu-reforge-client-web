import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): Captain Slough's quest board (DF).
export default defineModule({
  id: 'quest_board',
  install: installNet,
});
