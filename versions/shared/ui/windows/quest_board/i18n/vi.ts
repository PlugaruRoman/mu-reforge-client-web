/** vi text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Bậc thầy nhiệm vụ',
  'questBoard.accept': 'Nhận',
  'questBoard.claim': 'Lãnh thưởng',
  'questBoard.noQuests': 'Không có nhiệm vụ.',
  'questBoard.allCompleted': 'Đã hoàn thành mọi nhiệm vụ!',
  'questBoard.questOf': 'Nhiệm vụ {n} / {total}',
  'questBoard.progress': 'Tiến độ: {done} / {need}',
  'questBoard.reward': 'Phần thưởng',
  'questBoard.active': 'Nhiệm vụ đang làm',
} satisfies Partial<Record<keyof typeof en, string>>;
