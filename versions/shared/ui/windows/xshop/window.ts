import { defineWindow } from '@/controllers/interface/windows';
import { XShopWindow } from '.';

export default defineWindow({ id: 'xshop', module: 'xshop', slot: 'hud', order: 195, component: XShopWindow });
