/** uk text of `versions/shared/ui/windows/inventory`. */

import type en from './en';

export default {
  'inventory.title': 'Інвентар',
  'inventory.close': 'Закрити (I,V)',
  'inventory.repair': 'Полагодити (L)',
  'inventory.personalShop': 'Особиста крамниця',
  'inventory.expand': 'Відкрити розширений інвентар (K)',
  'inventory.plateJewelBankTip': 'Зберігай і забирай камені',
  'inventory.plateVipTip': 'Купити або подовжити VIP-підписку',
  'inventory.plateCollectionsTip': 'Реєструй предмети в колекціях заради постійних бонусів акаунта',
  'inventory.bagClickToBuy': 'Купити ще одну сумку',
  'inventory.bagTitle': 'Сумка інвентаря',
  'inventory.bagBuyFor': 'Купити ще одну сумку за {price} {currency}',
  'inventory.bagConfirm': 'Купити ще одну сумку інвентаря?',
  'inventory.bagBuy': 'Купити',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Гоблін-очки',
} satisfies Partial<Record<keyof typeof en, string>>;
