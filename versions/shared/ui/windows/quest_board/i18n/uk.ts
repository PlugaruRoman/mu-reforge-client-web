/** uk text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Майстер завдань',
  'questBoard.accept': 'Прийняти',
  'questBoard.claim': 'Забрати',
  'questBoard.noQuests': 'Доступних завдань немає.',
  'questBoard.allCompleted': 'Усі завдання виконано!',
  'questBoard.questOf': 'Завдання {n} / {total}',
  'questBoard.progress': 'Прогрес: {done} / {need}',
  'questBoard.reward': 'Нагорода',
  'questBoard.active': 'Активні завдання',
} satisfies Partial<Record<keyof typeof en, string>>;
