import { defineWindow } from '@/controllers/interface/windows';
import { ReforgeMenuWindow } from '.';

export default defineWindow({ id: 'reforge_menu', module: 'reforge_hud', slot: 'hud', order: 363, component: ReforgeMenuWindow });
