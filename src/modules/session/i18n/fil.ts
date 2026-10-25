/** fil text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Lumabas sa laro pagkatapos isara ang Chaos window.',
  'exit.noAnswer': 'Hindi sumagot ang server. Aalis pa rin.',
  'resume.done': 'Online na muli',
  'resume.failed': 'Hindi makakonekta muli',
  'resume.cancelled': 'Kinansela ang muling pagkonekta',
  'login.closingOldSession':
    'Nakakonekta pa ang account: isinasara ang lumang session at sinusubukan muli...',
  'login.tokenRefused': 'Nag-expire na ang naka-save mong login. Ilagay ang iyong password.',
  'login.tokenUnanswered':
    'Hindi sinagot ng server ang naka-save na login. Ilagay ang iyong password.',
  'connect.reconnecting': 'Muling kumokonekta sa server...',
  'connect.retryNow': 'Subukan ngayon',
  'connect.noWorld': 'Hindi ma-load ang listahan ng server. Sinusubukang muli...',
} satisfies Partial<Record<keyof typeof en, string>>;
