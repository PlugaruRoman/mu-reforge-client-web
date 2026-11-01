/** Chinese text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': '背包',
  'inventory.close': '关闭（I、V）',
  'inventory.repair': '修理（L）',
  'inventory.personalShop': '个人商店',
  'inventory.expand': '打开扩展背包（K）',
  'inventory.plateJewelBankTip': '存放与提取宝石',
  'inventory.plateVipTip': '购买或延长 VIP 订阅',
  'inventory.plateCollectionsTip': '将物品登记到收藏中，获得永久账号加成',
  'inventory.bagClickToBuy': '再购买一个背包',
  'inventory.bagTitle': '背包扩充',
  'inventory.bagBuyFor': '以 {price} {currency} 再购买一个背包',
  'inventory.bagConfirm': '要再购买一个背包吗？',
  'inventory.bagBuy': '购买',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': '哥布林点数',
} satisfies Partial<Record<keyof typeof en, string>>;
