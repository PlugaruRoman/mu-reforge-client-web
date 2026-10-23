/** English text of the `doppelganger` module. See src/i18n/readme.md. */

const en = {
  'doppelganger.alreadyStarted': 'The battle has already commenced. You cannot enter.',
  'doppelganger.outlaw': 'You cannot enter if you are a 1st stage outlaw.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/doppelganger': typeof en;
  }
}
