/** ko text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': '4차 날개',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': '고대 옵션 합성',
  'reforgeMix.ancientOptionRemoval': '고대 옵션 제거',
  'reforgeMix.mergeHelp': '합성: 옵션 없는 고대 아이템 + 엑설런트 옵션이 붙은 같은 아이템',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': '제거: 고대 아이템 하나만 넣으면 엑설런트 옵션을 잃습니다',
  'reforgeMix.mergeLoss': 'Jewel of Chaos Assembly를 넣지 않으면 합성 실패 시 고대 아이템이 파괴됩니다',
  'reforgeMix.stone': '아이템의 모든 엑설런트 옵션을 같은 아이템의 옵션 없는 고대 아이템으로 옮깁니다.',
  'reforgeMix.stoneUse': 'Ancient Smith에서 Jewel of Creation, Jewel of Chaos와 함께 조합하세요.',
} satisfies Partial<Record<keyof typeof en, string>>;
