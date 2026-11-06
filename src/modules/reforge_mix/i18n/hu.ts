/** hu text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': '4. szintű szárnyak',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Ősi opciók összeolvasztása',
  'reforgeMix.ancientOptionRemoval': 'Ősi opciók eltávolítása',
  'reforgeMix.mergeHelp': 'Összeolvasztás: tiszta ősi tárgy + ugyanaz a tárgy kiváló opciókkal',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Eltávolítás: egy ősi tárgy egyedül elveszti kiváló opcióit',
  'reforgeMix.mergeLoss': 'A sikertelen összeolvasztás elpusztítja az ősi tárgyat, hacsak nincs mellette Jewel of Chaos Assembly',
  'reforgeMix.stone': 'Egy tárgy összes kiváló opcióját átviszi ugyanannak a tárgynak egy tiszta ősi példányára.',
  'reforgeMix.stoneUse': 'Kombináld az Ancient Smith-nél egy Jewel of Creation és egy Jewel of Chaos mellé.',
} satisfies Partial<Record<keyof typeof en, string>>;
