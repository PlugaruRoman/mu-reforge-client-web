/** English text of the `hunt_log` window. See src/i18n/readme.md. */

const en = {
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
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/hunt_log': typeof en;
  }
}
