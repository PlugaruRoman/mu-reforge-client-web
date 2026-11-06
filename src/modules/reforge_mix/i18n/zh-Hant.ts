/** zh-Hant text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': '第4階翅膀',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': '古代選項融合',
  'reforgeMix.ancientOptionRemoval': '古代選項移除',
  'reforgeMix.mergeHelp': '融合：無選項的古代裝備 + 帶卓越選項的同一裝備',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': '移除：單獨放入古代裝備將失去卓越選項',
  'reforgeMix.mergeLoss': '未加入 Jewel of Chaos Assembly 時，融合失敗會摧毀古代裝備',
  'reforgeMix.stone': '將一件裝備的所有卓越選項轉移到同一裝備的無選項古代版本上。',
  'reforgeMix.stoneUse': '在 Ancient Smith 處與 Jewel of Creation 和 Jewel of Chaos 一起合成。',
} satisfies Partial<Record<keyof typeof en, string>>;
