/** ko text of the `hunt_log` window (English until translated). */

import type en from './en';

export default {
  'huntLog.title': 'Instant Hunting Log',
  'huntLog.time': 'Hunting time',
  'huntLog.damagePerMinute': 'Damage/min',
  'huntLog.zenPerMinute': 'Zen/min',
  'huntLog.lastZen': 'Last Zen',
  'huntLog.levelUps': 'Levels gained',
  'huntLog.expPerMinute': 'Exp/min no VIP',
  'huntLog.expPerMinuteVip': 'Exp/min with VIP',
  'huntLog.avgExpPerMonster': 'Avg exp/monster',
  'huntLog.lastExp': 'Last exp',
  'huntLog.nextLevelIn': 'Level {n} in',
  'huntLog.maxLevelIn': 'Max level in',
  'huntLog.resetAvailable': 'Reset is available!',
  'huntLog.foldHint': '클릭하면 접기/펼치기, 드래그하면 이동',
} satisfies Partial<Record<keyof typeof en, string>>;
