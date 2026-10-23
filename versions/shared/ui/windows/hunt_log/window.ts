import { defineWindow } from '@/controllers/interface/windows';
import { HuntLogHud } from '.';

export default defineWindow({ id: 'hunt_log', module: 'hunt_log', slot: 'hud', order: 445, component: HuntLogHud });
