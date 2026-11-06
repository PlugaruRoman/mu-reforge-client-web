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
} satisfies Partial<Record<keyof typeof en, string>>;
