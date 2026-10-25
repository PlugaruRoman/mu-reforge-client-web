import { defineModule } from '../module';
import { setHandOverCommand } from '../chat/chatCommands';
import { Economy } from '../economy/economy';
import { Hero } from '../hero';
import { OfflineModes } from './state';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's OFF EXP and OFF store hand-overs (/offlevel,
// /offstore). The windows' buttons call `OfflineModes`; a typed line takes the same path (`setHandOverCommand`),
// so the resume never logs back in over the offline session.
export default defineModule({
  id: 'offline_modes',
  install() {
    setHandOverCommand('offlevel', () => OfflineModes.offLevel());
    // Typed before the stall ever had a title: the hero's name, where the button path has the window's field.
    setHandOverCommand('offstore', () => OfflineModes.askOffStore(Economy.myShopName || Hero.name));
  },
});
