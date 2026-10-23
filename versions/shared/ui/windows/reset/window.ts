import { defineWindow } from '@/controllers/interface/windows';
import { ResetWindow } from '.';

export default defineWindow({ id: 'reset', module: 'resets', slot: 'hud', order: 297, component: ResetWindow });
