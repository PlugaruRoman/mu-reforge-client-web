/** pt text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Mestre de missões',
  'questBoard.accept': 'Aceitar',
  'questBoard.claim': 'Resgatar',
  'questBoard.noQuests': 'Nenhuma missão disponível.',
  'questBoard.allCompleted': 'Todas as missões concluídas!',
  'questBoard.questOf': 'Missão {n} / {total}',
  'questBoard.progress': 'Progresso: {done} / {need}',
  'questBoard.reward': 'Recompensa',
  'questBoard.active': 'Missões ativas',
} satisfies Partial<Record<keyof typeof en, string>>;
