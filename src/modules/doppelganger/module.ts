import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's Doppelganger match (C1 BF 0E-14, 0x92 16-19).
// Lugard's entry window stays the events module's (events/doppelganger.ts).
export default defineModule({
  id: 'doppelganger',
  install: installNet,
});
