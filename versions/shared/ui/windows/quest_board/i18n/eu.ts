/** eu text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Misio-maisua',
  'questBoard.accept': 'Onartu',
  'questBoard.claim': 'Jaso',
  'questBoard.noQuests': 'Ez dago misiorik eskuragarri.',
  'questBoard.allCompleted': 'Misio guztiak osatuta!',
  'questBoard.questOf': 'Misioa {n} / {total}',
  'questBoard.progress': 'Aurrerapena: {done} / {need}',
  'questBoard.reward': 'Saria',
  'questBoard.active': 'Misio aktiboak',
} satisfies Partial<Record<keyof typeof en, string>>;
