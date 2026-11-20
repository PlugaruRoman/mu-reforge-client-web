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
  'reforgeMix.muunPet': '뮨 펫',
  'reforgeMix.nightmare': 'Gold Fenrir를 무작위 뮨 펫으로 바꾼다.',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir, 옵션이 있는 엑설런트 +11 아이템,',
  'reforgeMix.nightmareUse2': 'Jewel of Chaos 1개와 Jewel of Life 5개. 실패하면 모두 사라진다.',
  'reforgeMix.muunOrigin': '탈것 없이 얻는 Gold Fenrir의 힘',
  'reforgeMix.muunDoubleDamage': '더블 데미지 확률 +{value}%',
  'reforgeMix.muunIgnoreDefense': '방어 무시 확률 +{value}%',
  'reforgeMix.muunDefenseRate': '방어 성공률 +{value}%',
  'reforgeMix.muunExcellentDamage': '엑설런트 데미지 확률 +{value}%',
  'reforgeMix.muunCriticalDamage': '크리티컬 데미지 확률 +{value}%',
  'reforgeMix.muunReflect': '받은 피해의 {value}% 반사',
  'reforgeMix.divineHorse': 'Divine Horse',
  'reforgeMix.divineHorseRide': 'Dark Lord가 Dark Horse처럼 탑승',
  'reforgeMix.divineHorseSkill': 'Earthshake 스킬 부여',
  'reforgeMix.divineHorseOrigin': 'Gold Fenrir와 Dark Horse로 제작',
  'reforgeMix.nightmareDivineHorse': 'Dark Horse도 함께 넣으면: 무작위 Divine Horse.',
} satisfies Partial<Record<keyof typeof en, string>>;
