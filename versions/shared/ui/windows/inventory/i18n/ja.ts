/** Japanese text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'インベントリ',
  'inventory.close': '閉じる（I、V）',
  'inventory.repair': '修理（L）',
  'inventory.personalShop': '個人商店',
  'inventory.expand': '拡張インベントリを開く（K）',
  'inventory.plateJewelBankTip': 'ジュエルの預け入れと引き出し',
  'inventory.plateVipTip': 'VIP会員の購入・延長',
  'inventory.plateCollectionsTip': 'アイテムをコレクションに登録してアカウント永久ボーナスを得ます',
  'inventory.bagClickToBuy': 'バッグをもう1つ購入',
  'inventory.bagTitle': 'インベントリバッグ',
  'inventory.bagBuyFor': '{price} {currency}でバッグをもう1つ購入',
  'inventory.bagConfirm': 'インベントリバッグをもう1つ購入しますか？',
  'inventory.bagBuy': '購入',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'ゴブリンポイント',
} satisfies Partial<Record<keyof typeof en, string>>;
