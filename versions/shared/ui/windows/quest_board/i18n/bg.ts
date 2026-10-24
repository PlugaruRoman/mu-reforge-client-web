/** bg text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Майстор на задачите',
  'questBoard.accept': 'Приеми',
  'questBoard.claim': 'Вземи',
  'questBoard.noQuests': 'Няма налични задачи.',
  'questBoard.allCompleted': 'Всички задачи са изпълнени!',
  'questBoard.questOf': 'Задача {n} / {total}',
  'questBoard.progress': 'Напредък: {done} / {need}',
  'questBoard.reward': 'Награда',
  'questBoard.active': 'Активни задачи',
} satisfies Partial<Record<keyof typeof en, string>>;
