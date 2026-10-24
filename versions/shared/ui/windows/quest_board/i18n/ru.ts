/** ru text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Мастер заданий',
  'questBoard.accept': 'Принять',
  'questBoard.claim': 'Забрать',
  'questBoard.noQuests': 'Доступных заданий нет.',
  'questBoard.allCompleted': 'Все задания выполнены!',
  'questBoard.questOf': 'Задание {n} / {total}',
  'questBoard.progress': 'Прогресс: {done} / {need}',
  'questBoard.reward': 'Награда',
  'questBoard.active': 'Активные задания',
} satisfies Partial<Record<keyof typeof en, string>>;
