/** Russian text of the `tvt` window. */

import type en from './en';

export default {
  'tvt.title': 'Команда против команды',
  'tvt.registrationOpen': 'РЕГИСТРАЦИЯ ОТКРЫТА!',
  'tvt.nextBattle': 'До следующей битвы',
  'tvt.joinHint': 'Успейте записаться',
  'tvt.scheduleTitle': 'Расписание (UTC)',
  'tvt.arenaTitle': 'Арена',
  'tvt.arenaDescription': 'Командная арена, 10 мин.',
  'tvt.winnersEarnZen': 'Победители получают зен.',
  'tvt.requiresLevel': 'Нужен уровень 300+',
  'tvt.scoreBlue': 'СИНИЕ  {n}',
  'tvt.scoreRed': 'КРАСНЫЕ  {n}',
  'tvt.join': 'Вступить',
  'tvt.hud': 'TvT',
} satisfies Partial<Record<keyof typeof en, string>>;
