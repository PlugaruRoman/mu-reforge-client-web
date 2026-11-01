/** Thai text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'กระเป๋า',
  'inventory.close': 'ปิด (I, V)',
  'inventory.repair': 'ซ่อม (L)',
  'inventory.personalShop': 'ร้านค้าส่วนตัว',
  'inventory.expand': 'เปิดกระเป๋าขยาย (K)',
  'inventory.plateJewelBankTip': 'ฝากและถอนอัญมณี',
  'inventory.plateVipTip': 'ซื้อหรือต่ออายุสมาชิก VIP',
  'inventory.plateCollectionsTip': 'ลงทะเบียนไอเทมในคอลเลกชันเพื่อรับโบนัสบัญชีถาวร',
  'inventory.bagClickToBuy': 'ซื้อกระเป๋าเพิ่มอีกหนึ่งใบ',
  'inventory.bagTitle': 'กระเป๋าช่องเก็บของ',
  'inventory.bagBuyFor': 'ซื้อกระเป๋าเพิ่มอีกหนึ่งใบในราคา {price} {currency}',
  'inventory.bagConfirm': 'ซื้อกระเป๋าช่องเก็บของเพิ่มอีกหนึ่งใบหรือไม่?',
  'inventory.bagBuy': 'ซื้อ',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'แต้มก็อบลิน',
} satisfies Partial<Record<keyof typeof en, string>>;
