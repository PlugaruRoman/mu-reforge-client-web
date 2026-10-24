/** ar text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'سيد المهام',
  'questBoard.accept': 'قبول',
  'questBoard.claim': 'استلام',
  'questBoard.noQuests': 'لا توجد مهام متاحة.',
  'questBoard.allCompleted': 'اكتملت جميع المهام!',
  'questBoard.questOf': 'المهمة {n} / {total}',
  'questBoard.progress': 'التقدم: {done} / {need}',
  'questBoard.reward': 'المكافأة',
  'questBoard.active': 'المهام النشطة',
} satisfies Partial<Record<keyof typeof en, string>>;
