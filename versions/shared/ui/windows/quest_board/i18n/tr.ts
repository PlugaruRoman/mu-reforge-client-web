/** tr text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Görev Ustası',
  'questBoard.accept': 'Kabul et',
  'questBoard.claim': 'Al',
  'questBoard.noQuests': 'Kullanılabilir görev yok.',
  'questBoard.allCompleted': 'Tüm görevler tamamlandı!',
  'questBoard.questOf': 'Görev {n} / {total}',
  'questBoard.progress': 'İlerleme: {done} / {need}',
  'questBoard.reward': 'Ödül',
  'questBoard.active': 'Aktif görevler',
} satisfies Partial<Record<keyof typeof en, string>>;
