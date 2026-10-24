/** fil text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Quest Master',
  'questBoard.accept': 'Tanggapin',
  'questBoard.claim': 'Kunin',
  'questBoard.noQuests': 'Walang available na quest.',
  'questBoard.allCompleted': 'Tapos na ang lahat ng quest!',
  'questBoard.questOf': 'Quest {n} / {total}',
  'questBoard.progress': 'Progreso: {done} / {need}',
  'questBoard.reward': 'Gantimpala',
  'questBoard.active': 'Mga aktibong quest',
} satisfies Partial<Record<keyof typeof en, string>>;
