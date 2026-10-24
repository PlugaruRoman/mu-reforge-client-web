import { defineWindow } from '@/controllers/interface/windows';
import { QuestBoardWindow } from '.';

export default defineWindow({ id: 'quest_board', module: 'quest_board', slot: 'hud', order: 314, component: QuestBoardWindow });
