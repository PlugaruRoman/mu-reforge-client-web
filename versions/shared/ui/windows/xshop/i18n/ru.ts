/** Russian text of the `xshop` window. */

import type en from './en';

export default {
  'xshopWindow.title': 'X-Shop',
  'xshopWindow.wcoinC': 'W Coin (C)',
  'xshopWindow.wcoinP': 'W Coin (P)',
  'xshopWindow.goblin': 'Очки Goblin',
  'xshopWindow.storage': 'Хранилище',
  'xshopWindow.storageEmpty': 'Хранилище пусто.',
  'xshopWindow.use': 'Использовать',
  'xshopWindow.buy': 'Купить',
  'xshopWindow.gift': 'Подарок',
  'xshopWindow.giftOff': 'Подарки в X-Shop отключены.',
  'xshopWindow.cancel': 'Отмена',
  'xshopWindow.price': 'Цена',
  'xshopWindow.notEnough': 'Недостаточно средств для этой цены.',
  'xshopWindow.days': '{count} дн.',
  'xshopWindow.loading': 'Загрузка магазина...',
  'xshopWindow.noPackages': 'Здесь ничего не продаётся.',
} satisfies Partial<Record<keyof typeof en, string>>;
