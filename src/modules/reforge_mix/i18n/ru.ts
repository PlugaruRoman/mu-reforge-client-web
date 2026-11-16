/** ru text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Крылья 4-го уровня',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Перенос опций на древний',
  'reforgeMix.ancientOptionRemoval': 'Снятие опций с древнего',
  'reforgeMix.mergeHelp': 'Перенос: древний предмет без опций + такой же предмет с excellent-опциями',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Снятие: один древний предмет теряет все excellent-опции',
  'reforgeMix.mergeLoss': 'Без Jewel of Chaos Assembly неудача уничтожает древний предмет',
  'reforgeMix.stone': 'Переносит все excellent-опции предмета на такой же древний предмет без опций.',
  'reforgeMix.stoneUse': 'Используйте у Ancient Smith вместе с Jewel of Creation и Jewel of Chaos.',
  'reforgeMix.muunPet': 'Питомец-муун',
  'reforgeMix.nightmare': 'Превращает Gold Fenrir в случайного питомца-муна.',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir, excellent-предмет +11 с опцией,',
  'reforgeMix.nightmareUse2': 'Jewel of Chaos и 5 Jewel of Life. При неудаче сгорает всё.',
  'reforgeMix.muunOrigin': 'Сила Gold Fenrir, но без ездового зверя',
  'reforgeMix.muunDoubleDamage': 'Шанс двойного урона +{value}%',
  'reforgeMix.muunIgnoreDefense': 'Шанс игнорировать защиту +{value}%',
  'reforgeMix.muunDefenseRate': 'Шанс успешной защиты +{value}%',
  'reforgeMix.muunExcellentDamage': 'Шанс отличного урона +{value}%',
  'reforgeMix.muunCriticalDamage': 'Шанс критического урона +{value}%',
  'reforgeMix.muunReflect': 'Отражает {value}% полученного урона',
} satisfies Partial<Record<keyof typeof en, string>>;
