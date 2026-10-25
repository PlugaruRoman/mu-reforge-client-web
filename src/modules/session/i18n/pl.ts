/** Polish text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Zamknij okno Chaos przed wyjściem z gry.',
  'exit.noAnswer': 'Serwer nie odpowiedział. Wychodzenie mimo to.',
  'resume.done': 'Znów online',
  'resume.failed': 'Nie udało się połączyć ponownie',
  'resume.cancelled': 'Ponowne łączenie anulowane',
  'login.closingOldSession': 'Konto nadal połączone: zamykanie starej sesji i ponowna próba...',
  'login.tokenRefused': 'Zapisane logowanie wygasło. Podaj hasło.',
  'login.tokenUnanswered': 'Serwer nie odpowiedział na zapisane logowanie. Podaj hasło.',
  'connect.reconnecting': 'Ponowne łączenie z serwerem...',
  'connect.retryNow': 'Spróbuj teraz',
  'connect.noWorld': 'Nie udało się wczytać listy serwerów. Ponawiam...',
} satisfies Partial<Record<keyof typeof en, string>>;
