/** sr-Latn text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Sistem (Esc)',
  'windowMenu.help': 'Pomoć (F1)',
  'windowMenu.guild': 'Gilda (G)',
  'windowMenu.move': 'Teleport (M)',
  'windowMenu.map': 'Mapa (Tab)',
  'windowMenu.gens': 'Gens info (B)',
  'windowMenu.reforge': 'Mu Reforge (N)',
} satisfies Partial<Record<keyof typeof en, string>>;
