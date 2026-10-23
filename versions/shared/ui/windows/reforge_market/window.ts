import { defineWindow } from '@/controllers/interface/windows';
import { ReforgeMarketWindow } from '.';

export default defineWindow({ id: 'reforge_market', module: 'reforge_market', slot: 'hud', order: 191, component: ReforgeMarketWindow });
