/** ro text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Maestrul misiunilor',
  'questBoard.accept': 'Acceptă',
  'questBoard.claim': 'Revendică',
  'questBoard.noQuests': 'Nu există misiuni disponibile.',
  'questBoard.allCompleted': 'Toate misiunile sunt finalizate!',
  'questBoard.questOf': 'Misiunea {n} / {total}',
  'questBoard.progress': 'Progres: {done} / {need}',
  'questBoard.reward': 'Recompensă',
  'questBoard.active': 'Misiuni active',
} satisfies Partial<Record<keyof typeof en, string>>;
