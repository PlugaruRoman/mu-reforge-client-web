/** Bulgarian text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Група',
  'party.leader': 'Водач на групата',
  'party.leave': 'Напусни групата',
  'party.kick': 'Изгони {name}',
  'party.nearby': 'Играчи наблизо',
  'party.nearbyEmpty': 'Застани до играч, за да го поканиш.',
  'party.tradeWith': 'Размяна с {name}',
  'party.notInParty': 'Не си в група.',
  'party.invite': 'Покани',
  'party.shop': 'Магазин',
  'party.find': 'Търси',
  'party.settings': 'Настройки',
  'party.giveLead': 'Да дам лидерството?',
  'party.giveLeadConfirm': 'Още веднъж',
} satisfies Partial<Record<keyof typeof en, string>>;
