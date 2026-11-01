/** Korean text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': '힘',
  'stat.short.agility': '민',
  'stat.short.vitality': '체',
  'stat.short.energy': '에',

  'charInfo.dmgRate': '공격력(성공률): {min}~{max} ({rate})',
  'charInfo.dmg': '공격력: {min}~{max}',
  'charInfo.attackRate': '공격 성공률: {value}',
  'charInfo.attackRateBonus': '공격 성공률: {value} (+{bonus})',
  'charInfo.defenseRateFull': '방어력(성공률): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': '방어력(성공률): {defense} ({rate})',
  'charInfo.defenseFull': '방어력: {defense} (+{bonus})',
  'charInfo.defense': '방어력: {defense}',
  'charInfo.attackSpeed': '공격 속도: {value}',
  'charInfo.defenseRatePvp': '방어 성공률: {value}',
  'charInfo.defenseRatePvpBonus': '방어 성공률: {value} (+{bonus})',
  'charInfo.hp': '생명력: {current} / {max}',
  'charInfo.meleeDamage': '근접 공격력: {value}%',
  'charInfo.mana': '마나: {current} / {max}',
  'charInfo.wizardryRate': '마력: {min}~{max} (+{rate})',
  'charInfo.wizardry': '마력: {min}~{max}',
  'charInfo.curseSpell': ' 저주 마법: {min} ~ {max}',
  'charInfo.curseSpellRate': ' 저주 마법: {min} ~ {max}(+{rate})',
  'charInfo.skillDamage': '스킬 공격력: {value}%',
  'charInfo.divineDamage': '신성 공격력(Roar, Slasher): {value}%',
  'charInfo.aoeDamage': '범위 공격력(Dark Side): {value}%',
  'charInfo.addAmount': '추가할 포인트',
  'charInfo.stopAdding': '중지',

  'characterInfo.title': '캐릭터',
  'characterInfo.close': '닫기(C)',
  'characterInfo.quest': '퀘스트(T)',
  'characterInfo.pet': '펫',
  'characterInfo.masterTree': '마스터 스킬 트리(A)',
  'charInfo.plateAddStatsTip': '레벨업 포인트를 한 번에 많이 쓰거나 서버가 대신 쓰게 합니다.',
  'charInfo.plateResetTip': '캐릭터를 낮은 레벨에서 다시 시작하고 리셋 횟수를 1 늘립니다.',
  'charInfo.plateGrandResetTip': '리셋 한 바퀴를 그랜드 리셋 1회로 바꾸고 리셋을 처음부터 다시 시작합니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
