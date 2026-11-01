/** Spanish text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Grupo',
  'party.leader': 'Líder del grupo',
  'party.leave': 'Salir del grupo',
  'party.kick': 'Expulsar a {name}',
  'party.nearby': 'Jugadores cercanos',
  'party.nearbyEmpty': 'Ponte junto a un jugador para invitarlo.',
  'party.tradeWith': 'Intercambiar con {name}',
  'party.notInParty': 'No estás en un grupo.',
  'party.invite': 'Invitar',
  'party.shop': 'Tienda',
  'party.find': 'Buscar',
  'party.settings': 'Ajustes',
  'party.giveLead': '¿Ceder el liderazgo?',
  'party.giveLeadConfirm': 'Pulsa otra vez',
} satisfies Partial<Record<keyof typeof en, string>>;
