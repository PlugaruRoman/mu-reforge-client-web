/** ja text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'クエストマスター',
  'questBoard.accept': '受ける',
  'questBoard.claim': '受け取る',
  'questBoard.noQuests': '受けられるクエストはありません。',
  'questBoard.allCompleted': 'すべてのクエストを達成しました!',
  'questBoard.questOf': 'クエスト {n} / {total}',
  'questBoard.progress': '進行: {done} / {need}',
  'questBoard.reward': '報酬',
  'questBoard.active': '進行中のクエスト',
} satisfies Partial<Record<keyof typeof en, string>>;
