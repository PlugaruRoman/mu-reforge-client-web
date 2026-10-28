/** Polish text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Sklep',
  'shop.repairAll': 'Napraw wszystko',
  'shop.repair': 'Napraw',
  'shop.tax': 'Podatek od sprzedaży: {rate}%',
  'julia.market1': 'Jeśli pójdziesz na rynek w Lorencii,',
  'julia.market2': 'znajdziesz wiele potrzebnych przedmiotów.',
  'julia.market3': 'Możesz tam też sprzedać swoje przedmioty.',
  'julia.marketAsk': 'Chcesz iść na rynek?',
  'julia.town': 'Miłego dnia!',
  'julia.townAsk': 'Chcesz iść do miasta?',
} satisfies Partial<Record<keyof typeof en, string>>;
