/** Italian text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Negozio',
  'shop.repairAll': 'Ripara tutto',
  'shop.repair': 'Ripara',
  'shop.tax': 'Tassa di vendita: {rate}%',
  'julia.market1': 'Se vai al mercato di Lorencia,',
  'julia.market2': 'troverai molti oggetti che ti servono.',
  'julia.market3': 'Lì puoi anche vendere i tuoi oggetti.',
  'julia.marketAsk': 'Vuoi andare al mercato?',
  'julia.town': 'Buona giornata!',
  'julia.townAsk': 'Vuoi andare in città?',
} satisfies Partial<Record<keyof typeof en, string>>;
