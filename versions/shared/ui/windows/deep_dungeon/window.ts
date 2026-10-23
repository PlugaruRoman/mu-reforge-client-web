import { defineWindow } from '@/controllers/interface/windows';
import { DeepDungeonWindows } from '.';

export default defineWindow({ id: 'deep_dungeon', module: 'deep_dungeon', slot: 'hud', order: 309, component: DeepDungeonWindows });
