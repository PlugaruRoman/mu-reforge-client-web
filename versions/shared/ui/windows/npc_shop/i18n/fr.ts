/** French text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Boutique',
  'shop.repairAll': 'Tout réparer',
  'shop.repair': 'Réparer',
  'shop.tax': 'Taxe de vente : {rate}%',
  'julia.market1': 'Si vous allez au marché de Lorencia,',
  'julia.market2': 'vous trouverez beaucoup d\'objets utiles.',
  'julia.market3': 'Vous pouvez aussi y vendre vos objets.',
  'julia.marketAsk': 'Voulez-vous aller au marché ?',
  'julia.town': 'Bonne journée !',
  'julia.townAsk': 'Voulez-vous aller en ville ?',
} satisfies Partial<Record<keyof typeof en, string>>;
