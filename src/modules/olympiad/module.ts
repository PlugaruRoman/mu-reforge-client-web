import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's Olympiad (C2 EE 01) and Death Records (C2 E0 01).
export default defineModule({
  id: 'olympiad',
  install: installNet,
});
