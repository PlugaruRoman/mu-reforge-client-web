/** Romanian text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Grup',
  'party.leader': 'Liderul grupului',
  'party.leave': 'Părăsește grupul',
  'party.kick': 'Dă afară pe {name}',
  'party.nearby': 'Jucători din apropiere',
  'party.nearbyEmpty': 'Stai lângă un jucător ca să îl inviți.',
  'party.tradeWith': 'Schimbă cu {name}',
  'party.notInParty': 'Nu ești într-un grup.',
  'party.invite': 'Invită',
  'party.shop': 'Magazin',
  'party.find': 'Caută',
  'party.settings': 'Setări',
  'party.giveLead': 'Cedezi conducerea?',
  'party.giveLeadConfirm': 'Apasă din nou',
} satisfies Partial<Record<keyof typeof en, string>>;
