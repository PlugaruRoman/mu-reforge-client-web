/** ca text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Ales de 4t nivell',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': "Fusió d'opcions antigues",
  'reforgeMix.ancientOptionRemoval': "Eliminació d'opcions antigues",
  'reforgeMix.mergeHelp': 'Fusió: un objecte antic net + el mateix objecte amb opcions excel·lents',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Eliminació: un objecte antic sol perd les opcions excel·lents',
  'reforgeMix.mergeLoss': "Una fusió fallida destrueix l'objecte antic si no s'hi afegeix una Jewel of Chaos Assembly",
  'reforgeMix.stone': "Mou totes les opcions excel·lents d'un objecte a una còpia antiga neta del mateix objecte.",
  'reforgeMix.stoneUse': "Combina-la amb l'Ancient Smith amb una Jewel of Creation i una Jewel of Chaos.",
} satisfies Partial<Record<keyof typeof en, string>>;
