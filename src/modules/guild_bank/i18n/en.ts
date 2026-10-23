/** English text of the `guild_bank` module. See src/i18n/readme.md. */

const en = {
  'guildBank.takeOffFirst': 'Take the item off first.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/guild_bank': typeof en;
  }
}
