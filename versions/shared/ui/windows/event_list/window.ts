import { defineWindow } from '@/controllers/interface/windows';
import { EventListWindow } from '.';

export default defineWindow({ id: 'event_list', module: 'event_list', slot: 'hud', order: 307, component: EventListWindow });
