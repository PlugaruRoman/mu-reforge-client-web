/** ca text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Tanca la interfície del caos abans de sortir del joc.',
  'exit.noAnswer': 'El servidor no ha respost. Se surt igualment.',
  'resume.done': 'De nou en línia',
  'resume.failed': 'No s\'ha pogut reconnectar',
  'resume.cancelled': 'Reconnexió cancel·lada',
  'login.closingOldSession':
    'El compte encara està connectat: es tanca la sessió anterior i es torna a provar...',
  'login.tokenRefused': 'L\'inici de sessió desat ha caducat. Escriu la contrasenya.',
  'login.tokenUnanswered':
    'El servidor no ha respost a l\'inici de sessió desat. Escriu la contrasenya.',
  'connect.reconnecting': 'Tornant a connectar amb el servidor...',
  'connect.retryNow': 'Torna-ho a provar ara',
  'connect.noWorld': 'No s\'ha pogut carregar la llista de servidors. Tornant-ho a provar...',
} satisfies Partial<Record<keyof typeof en, string>>;
