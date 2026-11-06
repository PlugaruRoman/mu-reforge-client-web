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
} satisfies Partial<Record<keyof typeof en, string>>;
