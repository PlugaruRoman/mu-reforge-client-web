import { defineModule } from '../module';
import { installNet } from './net';

// Reforge only (versions/shared/reforgeOnlyModules.ts): our server's event list (C1 97) and the
// Event Timer's timetable.
export default defineModule({
  id: 'event_list',
  install: installNet,
});
