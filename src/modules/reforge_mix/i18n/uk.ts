/** uk text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Крила 4-го рівня',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Перенесення древніх опцій',
  'reforgeMix.ancientOptionRemoval': 'Зняття древніх опцій',
  'reforgeMix.mergeHelp': 'Перенесення: древній предмет без опцій + такий самий предмет з excellent-опціями',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Зняття: один древній предмет втрачає всі excellent-опції',
  'reforgeMix.mergeLoss': 'Без Jewel of Chaos Assembly невдача знищує древній предмет',
  'reforgeMix.stone': 'Переносить усі excellent-опції предмета на такий самий древній предмет без опцій.',
  'reforgeMix.stoneUse': 'Використовуйте в Ancient Smith разом із Jewel of Creation і Jewel of Chaos.',
} satisfies Partial<Record<keyof typeof en, string>>;
