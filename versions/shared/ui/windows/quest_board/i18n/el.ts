/** el text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'Δάσκαλος αποστολών',
  'questBoard.accept': 'Αποδοχή',
  'questBoard.claim': 'Παραλαβή',
  'questBoard.noQuests': 'Δεν υπάρχουν διαθέσιμες αποστολές.',
  'questBoard.allCompleted': 'Όλες οι αποστολές ολοκληρώθηκαν!',
  'questBoard.questOf': 'Αποστολή {n} / {total}',
  'questBoard.progress': 'Πρόοδος: {done} / {need}',
  'questBoard.reward': 'Ανταμοιβή',
  'questBoard.active': 'Ενεργές αποστολές',
} satisfies Partial<Record<keyof typeof en, string>>;
