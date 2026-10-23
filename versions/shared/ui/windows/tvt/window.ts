import { defineWindow } from '@/controllers/interface/windows';
import { TvtWindows } from '.';

export default defineWindow({ id: 'tvt', module: 'tvt', slot: 'hud', order: 308, component: TvtWindows });
