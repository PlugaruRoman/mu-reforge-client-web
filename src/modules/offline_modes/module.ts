import { defineModule } from '../module';
import { setHandOverCommand } from '../chat/chatCommands';
import { Economy } from '../economy/economy';
import { OfflineModes } from './state';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's OFF EXP and OFF store hand-overs (/offlevel,
// /offstore). The windows' buttons call `OfflineModes`; a typed line takes the same path (`setHandOverCommand`),
// so the resume never logs back in over the offline session.
export default defineModule({
  id: 'offline_modes',
  install() {
    setHandOverCommand('offlevel', () => OfflineModes.offLevel());
    setHandOverCommand('offstore', () => OfflineModes.askOffStore(Economy.myShopName));
  },
});
