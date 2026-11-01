/** Spanish text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': '¿Gastar {points} punto de master en {skill}?',
  'master.spendPoints': '¿Gastar {points} puntos de master en {skill}?',
  'master.skillFallback': 'habilidad {number}',
  'master.resetTree': 'Reiniciar árbol',
} satisfies Partial<Record<keyof typeof en, string>>;
