/** Bulgarian text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Магазин',
  'shop.repairAll': 'Поправи всичко',
  'shop.repair': 'Поправи',
  'shop.tax': 'Данък при продажба: {rate}%',
  'julia.market1': 'Ако отидеш на пазара в Лоренция,',
  'julia.market2': 'ще намериш много нужни предмети.',
  'julia.market3': 'Там можеш и да продаваш своите предмети.',
  'julia.marketAsk': 'Искаш ли да отидеш на пазара?',
  'julia.town': 'Приятен ден!',
  'julia.townAsk': 'Искаш ли да отидеш в града?',
} satisfies Partial<Record<keyof typeof en, string>>;
