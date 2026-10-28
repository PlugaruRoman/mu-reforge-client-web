/** Portuguese text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Loja',
  'shop.repairAll': 'Reparar tudo',
  'shop.repair': 'Reparar',
  'shop.tax': 'Imposto de venda: {rate}%',
  'julia.market1': 'Se você for ao mercado de Lorencia,',
  'julia.market2': 'encontrará muitos itens de que precisa.',
  'julia.market3': 'Você também pode vender seus itens lá.',
  'julia.marketAsk': 'Você gostaria de ir ao mercado?',
  'julia.town': 'Tenha outro ótimo dia!',
  'julia.townAsk': 'Você gostaria de ir à cidade?',
} satisfies Partial<Record<keyof typeof en, string>>;
