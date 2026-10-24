/** ur text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'کوئسٹ ماسٹر',
  'questBoard.accept': 'قبول کریں',
  'questBoard.claim': 'وصول کریں',
  'questBoard.noQuests': 'کوئی کوئسٹ دستیاب نہیں',
  'questBoard.allCompleted': 'تمام کوئسٹ مکمل!',
  'questBoard.questOf': 'کوئسٹ {n} / {total}',
  'questBoard.progress': 'پیش رفت: {done} / {need}',
  'questBoard.reward': 'انعام',
  'questBoard.active': 'فعال کوئسٹ',
} satisfies Partial<Record<keyof typeof en, string>>;
