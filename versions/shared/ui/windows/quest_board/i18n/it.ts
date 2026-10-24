/** it text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Maestro delle missioni',
  'questBoard.accept': 'Accetta',
  'questBoard.claim': 'Riscuoti',
  'questBoard.noQuests': 'Nessuna missione disponibile.',
  'questBoard.allCompleted': 'Tutte le missioni completate!',
  'questBoard.questOf': 'Missione {n} / {total}',
  'questBoard.progress': 'Progresso: {done} / {need}',
  'questBoard.reward': 'Ricompensa',
  'questBoard.active': 'Missioni attive',
} satisfies Partial<Record<keyof typeof en, string>>;
