import { defineModule } from '../module';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's OFF EXP and OFF store hand-overs (/offlevel,
// /offstore). Nothing to listen to: the windows' buttons call `OfflineModes`.
export default defineModule({
  id: 'offline_modes',
  install() {},
});
