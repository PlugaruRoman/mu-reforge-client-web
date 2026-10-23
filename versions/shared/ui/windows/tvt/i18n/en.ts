/** English text of the `tvt` window. See src/i18n/readme.md. */

const en = {
  'tvt.title': 'Team vs Team',
  'tvt.registrationOpen': 'REGISTRATION OPEN!',
  'tvt.nextBattle': 'Next battle in',
  'tvt.joinHint': 'Join before it closes',
  'tvt.scheduleTitle': 'Schedule (UTC)',
  'tvt.arenaTitle': 'The arena',
  'tvt.arenaDescription': '10-min team arena.',
  'tvt.winnersEarnZen': 'Winners earn Zen.',
  'tvt.requiresLevel': 'Requires level 300+',
  'tvt.scoreBlue': 'BLUE  {n}',
  'tvt.scoreRed': 'RED  {n}',
  'tvt.join': 'Join',
  'tvt.hud': 'TvT',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/tvt': typeof en;
  }
}
