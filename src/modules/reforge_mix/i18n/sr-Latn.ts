/** sr-Latn text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Krila 4. nivoa',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Spajanje drevnih opcija',
  'reforgeMix.ancientOptionRemoval': 'Uklanjanje drevnih opcija',
  'reforgeMix.mergeHelp': 'Spajanje: čist drevni predmet + isti predmet sa odličnim opcijama',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Uklanjanje: drevni predmet sam gubi odlične opcije',
  'reforgeMix.mergeLoss': 'Neuspelo spajanje uništava drevni predmet, osim ako se doda Jewel of Chaos Assembly',
  'reforgeMix.stone': 'Prenosi sve odlične opcije predmeta na čistu drevnu kopiju istog predmeta.',
  'reforgeMix.stoneUse': 'Kombinuj ga kod Ancient Smith sa Jewel of Creation i Jewel of Chaos.',
} satisfies Partial<Record<keyof typeof en, string>>;
