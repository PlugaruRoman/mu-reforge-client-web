import { defineWindow } from '@/controllers/interface/windows';
import { EventTimerWindow } from '.';

export default defineWindow({ id: 'event_timer', module: 'event_list', slot: 'hud', order: 306, component: EventTimerWindow });
