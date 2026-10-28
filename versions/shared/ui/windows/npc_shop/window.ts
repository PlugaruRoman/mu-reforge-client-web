import { defineWindow } from '@/controllers/interface/windows';
import { NpcShop } from '.';
import { JuliaDialog } from './julia';

export default [
  defineWindow({ id: 'npc_shop', slot: 'hud', order: 90, component: NpcShop }),
  // Julia's Loren Market warp (NpcWindow 0x25): only our server opens it.
  defineWindow({ id: 'julia', slot: 'hud', order: 352, component: JuliaDialog }),
];
