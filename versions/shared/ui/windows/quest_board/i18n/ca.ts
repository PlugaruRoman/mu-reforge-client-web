/** ca text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Mestre de missions',
  'questBoard.accept': 'Accepta',
  'questBoard.claim': 'Reclama',
  'questBoard.noQuests': 'No hi ha missions disponibles.',
  'questBoard.allCompleted': 'Totes les missions completades!',
  'questBoard.questOf': 'Missió {n} / {total}',
  'questBoard.progress': 'Progrés: {done} / {need}',
  'questBoard.reward': 'Recompensa',
  'questBoard.active': 'Missions actives',
} satisfies Partial<Record<keyof typeof en, string>>;
