/** th text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'ผู้มอบภารกิจ',
  'questBoard.accept': 'รับ',
  'questBoard.claim': 'รับรางวัล',
  'questBoard.noQuests': 'ไม่มีภารกิจ',
  'questBoard.allCompleted': 'ทำภารกิจครบแล้ว!',
  'questBoard.questOf': 'ภารกิจ {n} / {total}',
  'questBoard.progress': 'ความคืบหน้า: {done} / {need}',
  'questBoard.reward': 'รางวัล',
  'questBoard.active': 'ภารกิจที่กำลังทำ',
} satisfies Partial<Record<keyof typeof en, string>>;
