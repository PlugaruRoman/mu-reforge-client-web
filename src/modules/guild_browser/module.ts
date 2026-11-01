import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): the Guild Wars and Guild Alliance browsers (DC 10-12).
// It needs the stock wars and alliances (`guild_war`), whose packets answer what the browsers send.
export default defineModule({
  id: 'guild_browser',
  requires: ['guild_war'],
  install: installNet,
});
