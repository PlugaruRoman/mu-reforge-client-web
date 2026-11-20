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
  'reforgeMix.muunPet': 'Муун любимец',
  'reforgeMix.nightmare': 'Превръща Gold Fenrir в случаен муун любимец.',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir, excellent предмет +11 с опция,',
  'reforgeMix.nightmareUse2': 'Jewel of Chaos и 5 Jewel of Life. При неуспех всичко изгаря.',
  'reforgeMix.muunOrigin': 'Силата на Gold Fenrir, без ездитното животно',
  'reforgeMix.muunDoubleDamage': 'Шанс за двойни щети +{value}%',
  'reforgeMix.muunIgnoreDefense': 'Шанс за игнориране на защита +{value}%',
  'reforgeMix.muunDefenseRate': 'Успеваемост на защитата +{value}%',
  'reforgeMix.muunExcellentDamage': 'Шанс за отлични щети +{value}%',
  'reforgeMix.muunCriticalDamage': 'Шанс за критични щети +{value}%',
  'reforgeMix.muunReflect': 'Отразява {value}% от получените щети',
  'reforgeMix.divineHorse': 'Divine Horse',
  'reforgeMix.divineHorseRide': 'Dark Lord го язди като Dark Horse',
  'reforgeMix.divineHorseSkill': 'Дава умението Earthshake',
  'reforgeMix.divineHorseOrigin': 'Направен от Gold Fenrir и Dark Horse',
  'reforgeMix.nightmareDivineHorse': 'И с Dark Horse в кутията: случаен Divine Horse.',
} satisfies Partial<Record<keyof typeof en, string>>;
