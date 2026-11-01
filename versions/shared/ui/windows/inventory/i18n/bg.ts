/** Bulgarian text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Раница',
  'inventory.close': 'Затвори (I,V)',
  'inventory.repair': 'Поправи (L)',
  'inventory.personalShop': 'Личен магазин',
  'inventory.expand': 'Отвори разширената раница (K)',
  'inventory.plateJewelBankTip': 'Съхранявай и тегли камъни',
  'inventory.plateVipTip': 'Купи или удължи VIP абонамент',
  'inventory.plateCollectionsTip': 'Регистрирай предмети в колекции за постоянни бонуси на акаунта',
  'inventory.bagClickToBuy': 'Купи още една чанта',
  'inventory.bagTitle': 'Чанта за инвентара',
  'inventory.bagBuyFor': 'Купи още една чанта за {price} {currency}',
  'inventory.bagConfirm': 'Да купиш ли още една чанта за инвентара?',
  'inventory.bagBuy': 'Купи',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Гоблин точки',
} satisfies Partial<Record<keyof typeof en, string>>;
