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
  'reforgeMix.muunPet': '缪恩宠物',
  'reforgeMix.nightmare': '将黄金芬里尔变成随机的缪恩宠物。',
  'reforgeMix.nightmareUse': 'Chaos Machine：Gold Fenrir、带追加属性的卓越 +11 装备、',
  'reforgeMix.nightmareUse2': '1 颗 Jewel of Chaos 和 5 颗 Jewel of Life。失败则全部烧毁。',
  'reforgeMix.muunOrigin': '黄金芬里尔的力量，无需坐骑',
  'reforgeMix.muunDoubleDamage': '双倍伤害几率 +{value}%',
  'reforgeMix.muunIgnoreDefense': '无视防御几率 +{value}%',
  'reforgeMix.muunDefenseRate': '防御成功率 +{value}%',
  'reforgeMix.muunExcellentDamage': '卓越伤害几率 +{value}%',
  'reforgeMix.muunCriticalDamage': '幸运一击伤害几率 +{value}%',
  'reforgeMix.muunReflect': '反射所受伤害的 {value}%',
} satisfies Partial<Record<keyof typeof en, string>>;
