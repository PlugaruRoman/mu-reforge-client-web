/** English text of the `reforge_menu` window. See src/i18n/readme.md. */

const en = {
  'reforgeMenu.title': 'Mu Reforge',
  'reforgeMenu.settings': 'Settings',
  'reforgeMenu.requests': 'Allow requests',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/reforge_menu': typeof en;
  }
}
