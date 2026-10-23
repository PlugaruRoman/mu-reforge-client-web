import { defineWindow } from '@/controllers/interface/windows';
import { OlympiadWindows } from '.';

export default defineWindow({ id: 'olympiad', module: 'olympiad', slot: 'hud', order: 312, component: OlympiadWindows });
