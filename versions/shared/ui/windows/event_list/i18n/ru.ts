/** Russian text of the `event_list` window. */

import type en from './en';

export default {
  'eventList.title': 'Список ивентов',
  'eventList.loading': 'Загрузка ивентов...',
  'eventList.empty': 'Доступных ивентов нет.',
  'eventList.noLimit': 'без лимита',
  'eventList.left': 'осталось {n}',
  'eventList.resetHint': 'Входы обнуляются в 00:00 UTC',
  'eventList.open': 'ОТКРЫТ',
  'eventList.running': 'ИДЁТ',
  'eventList.ended': 'ЗАВЕРШЁН',
  'eventList.entry.bloodCastle': 'Посланник Архангела в Девиасе',
  'eventList.entry.devilSquare': 'Харон в Нории (приглашение)',
  'eventList.entry.chaosCastle': 'Используйте Доспех Стражника',
  'eventList.entry.illusionTemple': 'Мираж в Девиасе / Эльбеланде',
  'eventList.timer': 'Таймер ивентов',
} satisfies Partial<Record<keyof typeof en, string>>;
