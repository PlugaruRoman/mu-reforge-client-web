import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's small HUD frames - party buffs (D8 04),
// PvP flags (EA), monster spots (D5), Guest Access (D0), the Chaos Machine's rate (EC) and the chat commands (F5 01).
export default defineModule({
  id: 'reforge_hud',
  install: installNet,
});
