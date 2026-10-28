/** Korean text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': '상점',
  'shop.repairAll': '모두 수리',
  'shop.repair': '수리',
  'shop.tax': '판매 수수료: {rate}%',
  'julia.market1': '로랜시아 시장에 가면',
  'julia.market2': '필요한 아이템을 많이 찾을 수 있습니다.',
  'julia.market3': '아이템을 팔 수도 있습니다.',
  'julia.marketAsk': '시장으로 이동하시겠습니까?',
  'julia.town': '좋은 하루 보내세요!',
  'julia.townAsk': '마을로 이동하시겠습니까?',
} satisfies Partial<Record<keyof typeof en, string>>;
