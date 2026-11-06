/** pl text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Skrzydła 4. poziomu',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Scalenie opcji starożytnych',
  'reforgeMix.ancientOptionRemoval': 'Usunięcie opcji starożytnych',
  'reforgeMix.mergeHelp': 'Scalenie: czysty przedmiot starożytny + ten sam przedmiot z opcjami excellent',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Usunięcie: sam przedmiot starożytny traci opcje excellent',
  'reforgeMix.mergeLoss': 'Nieudane scalenie niszczy przedmiot starożytny, chyba że dodano Jewel of Chaos Assembly',
  'reforgeMix.stone': 'Przenosi wszystkie opcje excellent przedmiotu na czystą starożytną kopię tego samego przedmiotu.',
  'reforgeMix.stoneUse': 'Połącz go u Ancient Smith z Jewel of Creation i Jewel of Chaos.',
} satisfies Partial<Record<keyof typeof en, string>>;
