/** id text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Master Misi',
  'questBoard.accept': 'Terima',
  'questBoard.claim': 'Klaim',
  'questBoard.noQuests': 'Tidak ada misi.',
  'questBoard.allCompleted': 'Semua misi selesai!',
  'questBoard.questOf': 'Misi {n} / {total}',
  'questBoard.progress': 'Progres: {done} / {need}',
  'questBoard.reward': 'Hadiah',
  'questBoard.active': 'Misi aktif',
} satisfies Partial<Record<keyof typeof en, string>>;
