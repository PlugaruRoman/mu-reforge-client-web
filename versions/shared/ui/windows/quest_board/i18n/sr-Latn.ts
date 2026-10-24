/** sr-Latn text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Majstor zadataka',
  'questBoard.accept': 'Prihvati',
  'questBoard.claim': 'Preuzmi',
  'questBoard.noQuests': 'Nema dostupnih zadataka.',
  'questBoard.allCompleted': 'Svi zadaci su završeni!',
  'questBoard.questOf': 'Zadatak {n} / {total}',
  'questBoard.progress': 'Napredak: {done} / {need}',
  'questBoard.reward': 'Nagrada',
  'questBoard.active': 'Aktivni zadaci',
} satisfies Partial<Record<keyof typeof en, string>>;
