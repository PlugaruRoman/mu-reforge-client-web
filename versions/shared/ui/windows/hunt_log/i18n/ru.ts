/** Russian text of the `hunt_log` window. */

import type en from './en';

export default {
  'huntLog.title': 'Журнал охоты',
  'huntLog.time': 'Время охоты',
  'huntLog.damagePerMinute': 'Урон в минуту',
  'huntLog.zenPerMinute': 'Зен в минуту',
  'huntLog.lastZen': 'Последний зен',
  'huntLog.levelUps': 'Получено уровней',
  'huntLog.expPerMinute': 'Опыт/мин без VIP',
  'huntLog.expPerMinuteVip': 'Опыт/мин с VIP',
  'huntLog.avgExpPerMonster': 'Ср. опыт за моба',
  'huntLog.lastExp': 'Последний опыт',
  'huntLog.nextLevelIn': 'До уровня {n}',
  'huntLog.maxLevelIn': 'До макс. уровня',
  'huntLog.resetAvailable': 'Ресет доступен!',
} satisfies Partial<Record<keyof typeof en, string>>;
