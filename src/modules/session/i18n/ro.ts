/** Romanian text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Închide fereastra Chaos înainte să ieși din joc.',
  'exit.noAnswer': 'Serverul nu a răspuns. Ieșim oricum.',
  'resume.done': 'Din nou online',
  'resume.failed': 'Reconectarea a eșuat',
  'resume.cancelled': 'Reconectare anulată',
  'login.closingOldSession': 'Contul este încă conectat: se închide sesiunea veche și se reîncearcă...',
  'login.tokenRefused': 'Autentificarea salvată a expirat. Introdu parola.',
  'login.tokenUnanswered': 'Serverul nu a răspuns la autentificarea salvată. Introdu parola.',
  'connect.reconnecting': 'Reconectare la server...',
  'connect.retryNow': 'Reîncearcă acum',
  'connect.noWorld': 'Lista de servere nu a putut fi încărcată. Se reîncearcă...',
} satisfies Partial<Record<keyof typeof en, string>>;
