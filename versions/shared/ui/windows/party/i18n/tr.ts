/** tr text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': 'Grup',
  'party.leader': 'Grup lideri',
  'party.leave': 'Gruptan ayrıl',
  'party.kick': 'Gruptan at: {name}',
  'party.nearby': 'Yakındaki oyuncular',
  'party.nearbyEmpty': 'Davet etmek için bir oyuncunun yanında dur.',
  'party.tradeWith': '{name} ile takas yap',
  'party.notInParty': 'Grupta değilsin.',
  'party.invite': 'Davet et',
  'party.shop': 'Dükkan',
  'party.find': 'Bul',
  'party.settings': 'Ayarlar',
  'party.giveLead': 'Liderliği ver?',
  'party.giveLeadConfirm': 'Tekrar tıkla',
} satisfies Partial<Record<keyof typeof en, string>>;
