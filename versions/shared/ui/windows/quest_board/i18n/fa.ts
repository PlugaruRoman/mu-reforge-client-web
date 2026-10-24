/** fa text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'استاد ماموریت‌ها',
  'questBoard.accept': 'پذیرفتن',
  'questBoard.claim': 'دریافت',
  'questBoard.noQuests': 'ماموریتی در دسترس نیست.',
  'questBoard.allCompleted': 'همه ماموریت‌ها انجام شد!',
  'questBoard.questOf': 'ماموریت {n} / {total}',
  'questBoard.progress': 'پیشرفت: {done} / {need}',
  'questBoard.reward': 'پاداش',
  'questBoard.active': 'ماموریت‌های فعال',
} satisfies Partial<Record<keyof typeof en, string>>;
