/** it text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Ali di 4º livello',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Fusione opzioni antiche',
  'reforgeMix.ancientOptionRemoval': 'Rimozione opzioni antiche',
  'reforgeMix.mergeHelp': 'Fusione: un oggetto antico pulito + lo stesso oggetto con opzioni eccellenti',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Rimozione: un oggetto antico da solo perde le opzioni eccellenti',
  'reforgeMix.mergeLoss': "Una fusione fallita distrugge l'oggetto antico, a meno di aggiungere una Jewel of Chaos Assembly",
  'reforgeMix.stone': 'Sposta tutte le opzioni eccellenti di un oggetto su una copia antica pulita dello stesso oggetto.',
  'reforgeMix.stoneUse': "Combinala dall'Ancient Smith con una Jewel of Creation e una Jewel of Chaos.",
} satisfies Partial<Record<keyof typeof en, string>>;
