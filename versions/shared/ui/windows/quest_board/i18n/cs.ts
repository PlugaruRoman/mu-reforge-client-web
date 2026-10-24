/** cs text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Mistr úkolů',
  'questBoard.accept': 'Přijmout',
  'questBoard.claim': 'Vyzvednout',
  'questBoard.noQuests': 'Žádné úkoly nejsou k dispozici.',
  'questBoard.allCompleted': 'Všechny úkoly splněny!',
  'questBoard.questOf': 'Úkol {n} / {total}',
  'questBoard.progress': 'Postup: {done} / {need}',
  'questBoard.reward': 'Odměna',
  'questBoard.active': 'Aktivní úkoly',
} satisfies Partial<Record<keyof typeof en, string>>;
