import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's Fort Siege (C1/C2 EF 01-06, the Herald 767).
export default defineModule({
  id: 'fort_siege',
  install: installNet,
});
