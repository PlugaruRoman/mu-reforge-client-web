/** zh text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': '第4阶翅膀',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': '古代选项融合',
  'reforgeMix.ancientOptionRemoval': '古代选项移除',
  'reforgeMix.mergeHelp': '融合：无选项的古代装备 + 带卓越选项的同一装备',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': '移除：单独放入古代装备将失去卓越选项',
  'reforgeMix.mergeLoss': '未加入 Jewel of Chaos Assembly 时，融合失败会摧毁古代装备',
  'reforgeMix.stone': '将一件装备的所有卓越选项转移到同一装备的无选项古代版本上。',
  'reforgeMix.stoneUse': '在 Ancient Smith 处与 Jewel of Creation 和 Jewel of Chaos 一起合成。',
} satisfies Partial<Record<keyof typeof en, string>>;
