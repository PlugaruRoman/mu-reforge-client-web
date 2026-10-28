/** Spanish text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Tienda',
  'shop.repairAll': 'Reparar todo',
  'shop.repair': 'Reparar',
  'shop.tax': 'Impuesto de venta: {rate}%',
  'julia.market1': 'Si vas al mercado de Lorencia,',
  'julia.market2': 'encontrarás muchos objetos que necesitas.',
  'julia.market3': 'También puedes vender tus objetos allí.',
  'julia.marketAsk': '¿Quieres ir al mercado?',
  'julia.town': '¡Que tengas otro gran día!',
  'julia.townAsk': '¿Quieres ir a la ciudad?',
} satisfies Partial<Record<keyof typeof en, string>>;
