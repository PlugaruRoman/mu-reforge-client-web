/** English text of the `vault_pages` module. See src/i18n/readme.md. */

const en = {
  'vaultPages.previous': 'Previous page',
  'vaultPages.next': 'Next page',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/vault_pages': typeof en;
  }
}
