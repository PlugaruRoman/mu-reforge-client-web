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
} satisfies Partial<Record<keyof typeof en, string>>;
