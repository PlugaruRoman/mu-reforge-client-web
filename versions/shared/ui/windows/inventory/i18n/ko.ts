/** Korean text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': '인벤토리',
  'inventory.close': '닫기(I, V)',
  'inventory.repair': '수리(L)',
  'inventory.personalShop': '개인 상점',
  'inventory.expand': '확장 인벤토리 열기(K)',
  'inventory.plateJewelBankTip': '보석 보관 및 인출',
  'inventory.plateVipTip': 'VIP 구독 구매 또는 연장',
  'inventory.plateCollectionsTip': '아이템을 컬렉션에 등록해 영구 계정 보너스를 얻습니다',
  'inventory.bagClickToBuy': '가방 하나 더 구매',
  'inventory.bagTitle': '인벤토리 가방',
  'inventory.bagBuyFor': '{price} {currency}에 가방 하나 더 구매',
  'inventory.bagConfirm': '인벤토리 가방을 하나 더 구매할까요?',
  'inventory.bagBuy': '구매',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': '고블린 포인트',
} satisfies Partial<Record<keyof typeof en, string>>;
