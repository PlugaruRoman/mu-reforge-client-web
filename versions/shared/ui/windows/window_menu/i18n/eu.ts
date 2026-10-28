/** eu text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Sistema (Esc)',
  'windowMenu.help': 'Laguntza (F1)',
  'windowMenu.guild': 'Gremioa (G)',
  'windowMenu.move': 'Mugitu (M)',
  'windowMenu.map': 'Mapa (Tab)',
  'windowMenu.gens': 'Gens informazioa (B)',
  'windowMenu.reforge': 'Mu Reforge (N)',
} satisfies Partial<Record<keyof typeof en, string>>;
