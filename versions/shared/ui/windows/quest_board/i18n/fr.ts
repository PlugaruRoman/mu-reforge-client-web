/** fr text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Maître des quêtes',
  'questBoard.accept': 'Accepter',
  'questBoard.claim': 'Réclamer',
  'questBoard.noQuests': 'Aucune quête disponible.',
  'questBoard.allCompleted': 'Toutes les quêtes sont terminées !',
  'questBoard.questOf': 'Quête {n} / {total}',
  'questBoard.progress': 'Progression : {done} / {need}',
  'questBoard.reward': 'Récompense',
  'questBoard.active': 'Quêtes actives',
} satisfies Partial<Record<keyof typeof en, string>>;
