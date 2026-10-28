/** English text of the `npc_shop` window. See src/i18n/readme.md. */

const en = {
  'shop.title': 'Shop',
  'shop.repairAll': 'Repair all',
  'shop.repair': 'Repair',
  'shop.tax': 'Sales tax: {rate}%',
  'julia.market1': 'If you go to the market in Lorencia,',
  'julia.market2': 'you\'ll find many items you need.',
  'julia.market3': 'You can sell your items there too.',
  'julia.marketAsk': 'Would you like to go to the market?',
  'julia.town': 'Have another great day!',
  'julia.townAsk': 'Would you like to go to town?',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/npc_shop': typeof en;
  }
}
