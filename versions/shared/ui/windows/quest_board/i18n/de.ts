/** de text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Questmeister',
  'questBoard.accept': 'Annehmen',
  'questBoard.claim': 'Abholen',
  'questBoard.noQuests': 'Keine Quests verfügbar.',
  'questBoard.allCompleted': 'Alle Quests abgeschlossen!',
  'questBoard.questOf': 'Quest {n} / {total}',
  'questBoard.progress': 'Fortschritt: {done} / {need}',
  'questBoard.reward': 'Belohnung',
  'questBoard.active': 'Aktive Quests',
} satisfies Partial<Record<keyof typeof en, string>>;
