/** bg text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Крила от 4-то ниво',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Сливане на древни опции',
  'reforgeMix.ancientOptionRemoval': 'Премахване на древни опции',
  'reforgeMix.mergeHelp': 'Сливане: чист древен предмет + същия предмет с отлични опции',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Премахване: древен предмет сам губи отличните си опции',
  'reforgeMix.mergeLoss': 'Неуспешно сливане унищожава древния предмет, освен ако не е добавен Jewel of Chaos Assembly',
  'reforgeMix.stone': 'Пренася всички отлични опции на предмет върху чисто древно копие на същия предмет.',
  'reforgeMix.stoneUse': 'Комбинирайте го при Ancient Smith с Jewel of Creation и Jewel of Chaos.',
} satisfies Partial<Record<keyof typeof en, string>>;
