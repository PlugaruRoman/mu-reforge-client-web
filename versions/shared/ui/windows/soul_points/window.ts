import { defineWindow } from '@/controllers/interface/windows';
import { SoulPointWindow } from '.';

export default defineWindow({ id: 'soul_points', module: 'soul_points', slot: 'hud', order: 299, component: SoulPointWindow });
