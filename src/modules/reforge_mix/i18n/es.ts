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
  'reforgeMix.muunPet': 'Mascota muun',
  'reforgeMix.nightmare': 'Convierte un Gold Fenrir en una mascota muun al azar.',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir, un objeto excelente +11 con opción,',
  'reforgeMix.nightmareUse2': 'un Jewel of Chaos y 5 Jewel of Life. Un fallo lo quema todo.',
  'reforgeMix.muunOrigin': 'El poder de un Gold Fenrir, sin la montura',
  'reforgeMix.muunDoubleDamage': 'Probabilidad de daño doble +{value}%',
  'reforgeMix.muunIgnoreDefense': 'Probabilidad de ignorar la defensa +{value}%',
  'reforgeMix.muunDefenseRate': 'Tasa de éxito de defensa +{value}%',
  'reforgeMix.muunExcellentDamage': 'Probabilidad de daño excelente +{value}%',
  'reforgeMix.muunCriticalDamage': 'Probabilidad de daño crítico +{value}%',
  'reforgeMix.muunReflect': 'Refleja el {value}% del daño recibido',
} satisfies Partial<Record<keyof typeof en, string>>;
