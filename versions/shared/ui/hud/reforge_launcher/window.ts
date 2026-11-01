import { defineWindow } from '@/controllers/interface/windows';
import { ReforgeLauncher } from '.';

export default defineWindow({ id: 'reforge_launcher', module: 'reforge_hud', slot: 'hud', order: 457, component: ReforgeLauncher });
