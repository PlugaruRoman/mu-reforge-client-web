/** eu text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': 'Taldea',
  'party.leader': 'Taldeburua',
  'party.leave': 'Utzi taldea',
  'party.kick': 'Kanporatu: {name}',
  'party.nearby': 'Inguruko jokalariak',
  'party.nearbyEmpty': 'Jarri jokalari baten ondoan gonbidatzeko.',
  'party.tradeWith': 'Trukatu honekin: {name}',
  'party.notInParty': 'Ez zaude talde batean.',
  'party.invite': 'Gonbidatu',
  'party.shop': 'Denda',
  'party.find': 'Bilatu',
  'party.settings': 'Ezarpenak',
  'party.giveLead': 'Buruzagitza eman?',
  'party.giveLeadConfirm': 'Egin klik berriro',
} satisfies Partial<Record<keyof typeof en, string>>;
