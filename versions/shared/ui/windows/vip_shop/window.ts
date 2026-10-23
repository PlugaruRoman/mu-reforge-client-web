import { defineWindow } from '@/controllers/interface/windows';
import { VipShopWindow } from '.';

export default defineWindow({ id: 'vip_shop', module: 'vip', slot: 'hud', order: 296, component: VipShopWindow });
