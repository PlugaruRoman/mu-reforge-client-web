/** Russian text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Магазин',
  'shop.repairAll': 'Починить всё',
  'shop.repair': 'Починить',
  'shop.tax': 'Налог с продажи: {rate}%',
  'julia.market1': 'Если вы отправитесь на рынок Лоренсии,',
  'julia.market2': 'вы найдёте много нужных предметов.',
  'julia.market3': 'Там же можно продать свои предметы.',
  'julia.marketAsk': 'Хотели бы вы пойти на рынок?',
  'julia.town': 'Хорошего дня!',
  'julia.townAsk': 'Хотите вернуться в город?',
} satisfies Partial<Record<keyof typeof en, string>>;
