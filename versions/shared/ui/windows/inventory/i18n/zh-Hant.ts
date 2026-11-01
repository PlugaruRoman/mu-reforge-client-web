/** zh-Hant text of `versions/shared/ui/windows/inventory`. */

import type en from './en';

export default {
  'inventory.title': '背包',
  'inventory.close': '關閉（I、V）',
  'inventory.repair': '修理（L）',
  'inventory.personalShop': '個人商店',
  'inventory.expand': '開啟擴充背包（K）',
  'inventory.plateJewelBankTip': '存放與提取寶石',
  'inventory.plateVipTip': '購買或延長 VIP 訂閱',
  'inventory.plateCollectionsTip': '將物品登錄到收藏中，獲得永久帳號加成',
  'inventory.bagClickToBuy': '再購買一個背包',
  'inventory.bagTitle': '背包擴充',
  'inventory.bagBuyFor': '以 {price} {currency} 再購買一個背包',
  'inventory.bagConfirm': '要再購買一個背包嗎？',
  'inventory.bagBuy': '購買',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': '哥布林點數',
} satisfies Partial<Record<keyof typeof en, string>>;
