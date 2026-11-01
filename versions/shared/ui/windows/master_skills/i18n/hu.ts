/** hu text of `versions/shared/ui/windows/master_skills`. */

import type en from './en';

export default {
  'master.spendPoint': 'Elköltesz {points} mesterpontot erre: {skill}?',
  'master.spendPoints': 'Elköltesz {points} mesterpontot erre: {skill}?',
  'master.skillFallback': '{number}. képesség',
  'master.resetTree': 'Fa visszaállítása',
} satisfies Partial<Record<keyof typeof en, string>>;
