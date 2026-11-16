/** ja text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': '第4段階の翼',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'エンシェントオプション統合',
  'reforgeMix.ancientOptionRemoval': 'エンシェントオプション除去',
  'reforgeMix.mergeHelp': '統合：オプションなしのエンシェント装備 + エクセレントオプション付きの同じ装備',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': '除去：エンシェント装備単体でエクセレントオプションを失う',
  'reforgeMix.mergeLoss': 'Jewel of Chaos Assemblyを入れないと、統合失敗時にエンシェント装備は消滅します',
  'reforgeMix.stone': 'アイテムのエクセレントオプションをすべて、同じアイテムのオプションなしエンシェント版へ移します。',
  'reforgeMix.stoneUse': 'Ancient SmithでJewel of CreationとJewel of Chaosと一緒に合成してください。',
  'reforgeMix.muunPet': 'ムーンペット',
  'reforgeMix.nightmare': 'Gold Fenrirをランダムなムーンペットに変える。',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir、オプション付きエクセレント+11アイテム、',
  'reforgeMix.nightmareUse2': 'Jewel of Chaos 1個とJewel of Life 5個。失敗するとすべて燃え尽きる。',
  'reforgeMix.muunOrigin': '騎乗なしのGold Fenrirの力',
  'reforgeMix.muunDoubleDamage': 'ダブルダメージ確率 +{value}%',
  'reforgeMix.muunIgnoreDefense': '防御無視確率 +{value}%',
  'reforgeMix.muunDefenseRate': '防御成功率 +{value}%',
  'reforgeMix.muunExcellentDamage': 'エクセレントダメージ確率 +{value}%',
  'reforgeMix.muunCriticalDamage': 'クリティカルダメージ確率 +{value}%',
  'reforgeMix.muunReflect': '受けたダメージの{value}%を反射',
} satisfies Partial<Record<keyof typeof en, string>>;
