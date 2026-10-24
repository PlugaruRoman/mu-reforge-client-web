/** English text of the `reforge_mix` module. See src/i18n/readme.md. */

const en = {
  'reforgeMix.fourthWings': '4th Level Wings',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/reforge_mix': typeof en;
  }
}
