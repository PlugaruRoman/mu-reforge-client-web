/** ro text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Aripi de nivelul 4',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Contopirea opțiunilor antice',
  'reforgeMix.ancientOptionRemoval': 'Eliminarea opțiunilor antice',
  'reforgeMix.mergeHelp': 'Contopire: un obiect antic curat + același obiect cu opțiuni excelente',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Eliminare: un obiect antic singur își pierde opțiunile excelente',
  'reforgeMix.mergeLoss': 'O contopire eșuată distruge obiectul antic, dacă nu se adaugă un Jewel of Chaos Assembly',
  'reforgeMix.stone': 'Mută toate opțiunile excelente ale unui obiect pe o copie antică curată a aceluiași obiect.',
  'reforgeMix.stoneUse': 'Combină-l la Ancient Smith cu un Jewel of Creation și un Jewel of Chaos.',
  'reforgeMix.muunPet': 'Animal muun',
  'reforgeMix.nightmare': 'Transformă un Gold Fenrir într-un animal muun aleatoriu.',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir, un obiect excelent +11 cu opțiune,',
  'reforgeMix.nightmareUse2': 'un Jewel of Chaos și 5 Jewel of Life. Un eșec arde tot.',
  'reforgeMix.muunOrigin': 'Puterea unui Gold Fenrir, fără montură',
  'reforgeMix.muunDoubleDamage': 'Șansă de daune duble +{value}%',
  'reforgeMix.muunIgnoreDefense': 'Șansă de a ignora apărarea +{value}%',
  'reforgeMix.muunDefenseRate': 'Rată de reușită a apărării +{value}%',
  'reforgeMix.muunExcellentDamage': 'Șansă de daune excelente +{value}%',
  'reforgeMix.muunCriticalDamage': 'Șansă de daune critice +{value}%',
  'reforgeMix.muunReflect': 'Reflectă {value}% din daunele primite',
} satisfies Partial<Record<keyof typeof en, string>>;
