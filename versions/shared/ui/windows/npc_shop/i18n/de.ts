/** German text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Laden',
  'shop.repairAll': 'Alles reparieren',
  'shop.repair': 'Reparieren',
  'shop.tax': 'Verkaufssteuer: {rate}%',
  'julia.market1': 'Wenn Sie zum Markt von Lorencia gehen,',
  'julia.market2': 'finden Sie viele Gegenstände, die Sie brauchen.',
  'julia.market3': 'Dort können Sie auch Ihre Gegenstände verkaufen.',
  'julia.marketAsk': 'Möchten Sie zum Markt gehen?',
  'julia.town': 'Einen weiteren schönen Tag!',
  'julia.townAsk': 'Möchten Sie in die Stadt gehen?',
} satisfies Partial<Record<keyof typeof en, string>>;
