/** Korean text of the `party` window. */

import type en from './en';

export default {
  'party.title': '파티',
  'party.leader': '파티장',
  'party.leave': '파티 나가기',
  'party.kick': '{name} 추방',
  'party.nearby': '주변 플레이어',
  'party.nearbyEmpty': '플레이어 옆에 서면 초대할 수 있습니다.',
  'party.tradeWith': '{name}와(과) 거래',
  'party.notInParty': '파티에 속해 있지 않습니다.',
  'party.invite': '초대',
  'party.shop': '상점',
  'party.find': '찾기',
  'party.settings': '설정',
  'party.giveLead': '파티장을 넘길까요?',
  'party.giveLeadConfirm': '한 번 더 클릭',
} satisfies Partial<Record<keyof typeof en, string>>;
