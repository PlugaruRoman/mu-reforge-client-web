/** fr text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Ailes de niveau 4',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': "Fusion d'options anciennes",
  'reforgeMix.ancientOptionRemoval': "Retrait d'options anciennes",
  'reforgeMix.mergeHelp': 'Fusion : un objet ancien vierge + le même objet avec des options excellentes',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Retrait : un objet ancien seul perd ses options excellentes',
  'reforgeMix.mergeLoss': "Une fusion ratée détruit l'objet ancien, sauf si une Jewel of Chaos Assembly est ajoutée",
  'reforgeMix.stone': "Transfère toutes les options excellentes d'un objet sur une copie ancienne vierge du même objet.",
  'reforgeMix.stoneUse': "À combiner chez l'Ancient Smith avec une Jewel of Creation et une Jewel of Chaos.",
  'reforgeMix.muunPet': 'Familier muun',
  'reforgeMix.nightmare': 'Transforme un Gold Fenrir en familier muun aléatoire.',
  'reforgeMix.nightmareUse': 'Chaos Machine : Gold Fenrir, un objet excellent +11 avec option,',
  'reforgeMix.nightmareUse2': 'un Jewel of Chaos et 5 Jewel of Life. Un échec brûle tout.',
  'reforgeMix.muunOrigin': 'La puissance d\'un Gold Fenrir, sans la monture',
  'reforgeMix.muunDoubleDamage': 'Chance de dégâts doublés +{value}%',
  'reforgeMix.muunIgnoreDefense': 'Chance d\'ignorer la défense +{value}%',
  'reforgeMix.muunDefenseRate': 'Taux de réussite de défense +{value}%',
  'reforgeMix.muunExcellentDamage': 'Chance de dégâts excellents +{value}%',
  'reforgeMix.muunCriticalDamage': 'Chance de dégâts critiques +{value}%',
  'reforgeMix.muunReflect': 'Renvoie {value}% des dégâts subis',
  'reforgeMix.divineHorse': 'Divine Horse',
  'reforgeMix.divineHorseRide': 'Monté par le Dark Lord comme le Dark Horse',
  'reforgeMix.divineHorseSkill': 'Confère la compétence Earthshake',
  'reforgeMix.divineHorseOrigin': 'Fait d\'un Gold Fenrir et d\'un Dark Horse',
  'reforgeMix.nightmareDivineHorse': 'Avec un Dark Horse en plus : un Divine Horse au hasard.',
} satisfies Partial<Record<keyof typeof en, string>>;
