/** Russian text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'Система (Esc)',
  'windowMenu.help': 'Помощь (F1)',
  'windowMenu.guild': 'Гильдия (G)',
  'windowMenu.move': 'Перемещение (M)',
  'windowMenu.map': 'Карта (Tab)',
  'windowMenu.gens': 'Инфо Gens (B)',
  'windowMenu.reforge': 'Mu Reforge (N)',
} satisfies Partial<Record<keyof typeof en, string>>;
