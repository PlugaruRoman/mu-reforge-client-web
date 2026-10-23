/** Russian text of the `doppelganger` module. */

import type en from './en';

export default {
  'doppelganger.alreadyStarted': 'The battle has already commenced. You cannot enter.',
  'doppelganger.outlaw': 'You cannot enter if you are a 1st stage outlaw.',
} satisfies Partial<Record<keyof typeof en, string>>;
