import { defineWindow } from '@/controllers/interface/windows';
import { ReforgeHudWindows } from '.';
import { OffStoreConfirm } from './offModes';

export default [
  defineWindow({ id: 'reforge_hud', module: 'reforge_hud', slot: 'hud', order: 66, component: ReforgeHudWindows }),
  defineWindow({ id: 'off_store_confirm', module: 'offline_modes', slot: 'hud', order: 361, component: OffStoreConfirm }),
];
