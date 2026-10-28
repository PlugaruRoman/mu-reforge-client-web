/** el text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Σύστημα (Esc)',
  'windowMenu.help': 'Βοήθεια (F1)',
  'windowMenu.guild': 'Συντεχνία (G)',
  'windowMenu.move': 'Μετακίνηση (M)',
  'windowMenu.map': 'Χάρτης (Tab)',
  'windowMenu.gens': 'Πληροφορίες Gens (B)',
  'windowMenu.reforge': 'Mu Reforge (N)',
} satisfies Partial<Record<keyof typeof en, string>>;
