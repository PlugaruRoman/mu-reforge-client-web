import { defineWindow } from '@/controllers/interface/windows';
import { ItemCollectionsWindow } from '.';

export default defineWindow({ id: 'item_collections', module: 'item_collections', slot: 'hud', order: 205, component: ItemCollectionsWindow });
