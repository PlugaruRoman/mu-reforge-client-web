import { defineWindow } from '@/controllers/interface/windows';
import { AddStatsWindow } from '.';

export default defineWindow({ id: 'add_stats', module: 'resets', slot: 'hud', order: 298, component: AddStatsWindow });
