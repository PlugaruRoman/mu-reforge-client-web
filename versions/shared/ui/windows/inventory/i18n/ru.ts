/** Russian text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Инвентарь',
  'inventory.close': 'Закрыть (I,V)',
  'inventory.repair': 'Починить (L)',
  'inventory.personalShop': 'Личный магазин',
  'inventory.expand': 'Открыть расширенный инвентарь (K)',
  'inventory.plateJewelBankTip': 'Храни и забирай камни',
  'inventory.plateVipTip': 'Купить или продлить VIP-подписку',
  'inventory.plateCollectionsTip': 'Регистрируй предметы в коллекциях ради постоянных бонусов аккаунта',
  'inventory.bagClickToBuy': 'Купить ещё одну сумку',
  'inventory.bagTitle': 'Сумка инвентаря',
  'inventory.bagBuyFor': 'Купить ещё одну сумку за {price} {currency}',
  'inventory.bagConfirm': 'Купить ещё одну сумку инвентаря?',
  'inventory.bagBuy': 'Купить',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Гоблин-очки',
} satisfies Partial<Record<keyof typeof en, string>>;
