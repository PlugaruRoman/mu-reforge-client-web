/** es text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Maestro de misiones',
  'questBoard.accept': 'Aceptar',
  'questBoard.claim': 'Reclamar',
  'questBoard.noQuests': 'No hay misiones disponibles.',
  'questBoard.allCompleted': '¡Todas las misiones completadas!',
  'questBoard.questOf': 'Misión {n} / {total}',
  'questBoard.progress': 'Progreso: {done} / {need}',
  'questBoard.reward': 'Recompensa',
  'questBoard.active': 'Misiones activas',
} satisfies Partial<Record<keyof typeof en, string>>;
