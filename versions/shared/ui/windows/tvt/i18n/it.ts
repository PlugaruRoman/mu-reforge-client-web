/** it text of the `tvt` window (English until translated). */

import type en from './en';

export default {
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
} satisfies Partial<Record<keyof typeof en, string>>;
