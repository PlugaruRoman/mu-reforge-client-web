/** hu text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Küldetésmester',
  'questBoard.accept': 'Elfogad',
  'questBoard.claim': 'Átvesz',
  'questBoard.noQuests': 'Nincs elérhető küldetés.',
  'questBoard.allCompleted': 'Minden küldetés teljesítve!',
  'questBoard.questOf': 'Küldetés {n} / {total}',
  'questBoard.progress': 'Haladás: {done} / {need}',
  'questBoard.reward': 'Jutalom',
  'questBoard.active': 'Aktív küldetések',
} satisfies Partial<Record<keyof typeof en, string>>;
