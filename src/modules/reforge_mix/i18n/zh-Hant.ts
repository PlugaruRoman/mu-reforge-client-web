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
  'reforgeMix.muunPet': '繆恩寵物',
  'reforgeMix.nightmare': '將黃金芬里爾變成隨機的繆恩寵物。',
  'reforgeMix.nightmareUse': 'Chaos Machine：Gold Fenrir、帶追加屬性的卓越 +11 裝備、',
  'reforgeMix.nightmareUse2': '1 顆 Jewel of Chaos 和 5 顆 Jewel of Life。失敗則全部燒毀。',
  'reforgeMix.muunOrigin': '黃金芬里爾的力量，無需坐騎',
  'reforgeMix.muunDoubleDamage': '雙倍傷害機率 +{value}%',
  'reforgeMix.muunIgnoreDefense': '無視防禦機率 +{value}%',
  'reforgeMix.muunDefenseRate': '防禦成功率 +{value}%',
  'reforgeMix.muunExcellentDamage': '卓越傷害機率 +{value}%',
  'reforgeMix.muunCriticalDamage': '幸運一擊傷害機率 +{value}%',
  'reforgeMix.muunReflect': '反射所受傷害的 {value}%',
  'reforgeMix.divineHorse': 'Divine Horse',
  'reforgeMix.divineHorseRide': 'Dark Lord 可如 Dark Horse 般騎乘',
  'reforgeMix.divineHorseSkill': '賦予 Earthshake 技能',
  'reforgeMix.divineHorseOrigin': '由 Gold Fenrir 與 Dark Horse 製成',
  'reforgeMix.nightmareDivineHorse': '再放入 Dark Horse：隨機一匹 Divine Horse。',
} satisfies Partial<Record<keyof typeof en, string>>;
