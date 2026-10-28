/** Japanese text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'ショップ',
  'shop.repairAll': 'すべて修理',
  'shop.repair': '修理',
  'shop.tax': '販売税: {rate}%',
  'julia.market1': 'ロレンシアの市場に行けば、',
  'julia.market2': '必要なアイテムがたくさん見つかります。',
  'julia.market3': 'アイテムを売ることもできます。',
  'julia.marketAsk': '市場に移動しますか?',
  'julia.town': '良い一日を!',
  'julia.townAsk': '町に移動しますか?',
} satisfies Partial<Record<keyof typeof en, string>>;
