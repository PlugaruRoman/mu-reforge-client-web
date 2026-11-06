/** es text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Alas de 4.º nivel',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Fusión de opciones antiguas',
  'reforgeMix.ancientOptionRemoval': 'Eliminación de opciones antiguas',
  'reforgeMix.mergeHelp': 'Fusión: un objeto antiguo limpio + el mismo objeto con opciones excelentes',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Eliminación: un objeto antiguo solo pierde sus opciones excelentes',
  'reforgeMix.mergeLoss': 'Una fusión fallida destruye el objeto antiguo salvo que se añada una Jewel of Chaos Assembly',
  'reforgeMix.stone': 'Pasa todas las opciones excelentes de un objeto a una copia antigua limpia del mismo objeto.',
  'reforgeMix.stoneUse': 'Combínala con el Ancient Smith junto a una Jewel of Creation y una Jewel of Chaos.',
} satisfies Partial<Record<keyof typeof en, string>>;
