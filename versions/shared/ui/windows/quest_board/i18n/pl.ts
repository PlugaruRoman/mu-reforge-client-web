/** pl text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Mistrz zadań',
  'questBoard.accept': 'Przyjmij',
  'questBoard.claim': 'Odbierz',
  'questBoard.noQuests': 'Brak dostępnych zadań.',
  'questBoard.allCompleted': 'Wszystkie zadania ukończone!',
  'questBoard.questOf': 'Zadanie {n} / {total}',
  'questBoard.progress': 'Postęp: {done} / {need}',
  'questBoard.reward': 'Nagroda',
  'questBoard.active': 'Aktywne zadania',
} satisfies Partial<Record<keyof typeof en, string>>;
