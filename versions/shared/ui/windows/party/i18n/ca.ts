/** ca text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': 'Grup',
  'party.leader': 'Líder del grup',
  'party.leave': 'Surt del grup',
  'party.kick': 'Expulsa {name}',
  'party.nearby': 'Jugadors propers',
  'party.nearbyEmpty': 'Posa\'t al costat d\'un jugador per convidar-lo.',
  'party.tradeWith': 'Intercanvia amb {name}',
  'party.notInParty': 'No ets en cap grup.',
  'party.invite': 'Convida',
  'party.shop': 'Botiga',
  'party.find': 'Cercar',
  'party.settings': 'Configuració',
  'party.giveLead': 'Cedir el lideratge?',
  'party.giveLeadConfirm': 'Torna a clicar',
} satisfies Partial<Record<keyof typeof en, string>>;
