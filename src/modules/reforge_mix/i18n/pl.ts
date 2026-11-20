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
  'reforgeMix.muunPet': 'Pupil muun',
  'reforgeMix.nightmare': 'Zamienia Gold Fenrir w losowego pupila muun.',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir, doskonały przedmiot +11 z opcją,',
  'reforgeMix.nightmareUse2': 'Jewel of Chaos i 5 Jewel of Life. Porażka niszczy wszystko.',
  'reforgeMix.muunOrigin': 'Moc Gold Fenrira, bez wierzchowca',
  'reforgeMix.muunDoubleDamage': 'Szansa na podwójne obrażenia +{value}%',
  'reforgeMix.muunIgnoreDefense': 'Szansa na zignorowanie obrony +{value}%',
  'reforgeMix.muunDefenseRate': 'Skuteczność obrony +{value}%',
  'reforgeMix.muunExcellentDamage': 'Szansa na doskonałe obrażenia +{value}%',
  'reforgeMix.muunCriticalDamage': 'Szansa na krytyczne obrażenia +{value}%',
  'reforgeMix.muunReflect': 'Odbija {value}% otrzymanych obrażeń',
  'reforgeMix.divineHorse': 'Divine Horse',
  'reforgeMix.divineHorseRide': 'Dark Lord jeździ na nim jak na Dark Horse',
  'reforgeMix.divineHorseSkill': 'Daje umiejętność Earthshake',
  'reforgeMix.divineHorseOrigin': 'Powstaje z Gold Fenrir i Dark Horse',
  'reforgeMix.nightmareDivineHorse': 'Z Dark Horse w skrzynce: losowy Divine Horse.',
} satisfies Partial<Record<keyof typeof en, string>>;
