/** Polish text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': 'Wydać punkty master ({points}) na {skill}?',
  'master.spendPoints': 'Wydać punkty master ({points}) na {skill}?',
  'master.skillFallback': 'umiejętność {number}',
  'master.resetTree': 'Resetuj drzewko',
} satisfies Partial<Record<keyof typeof en, string>>;
