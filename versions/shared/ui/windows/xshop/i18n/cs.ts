/** cs text of the `xshop` window. */

import type en from './en';

export default {
  'xshopWindow.title': 'X-Shop',
  'xshopWindow.wcoinC': 'W Coin (C)',
  'xshopWindow.wcoinP': 'W Coin (P)',
  'xshopWindow.goblin': 'Goblin Points',
  'xshopWindow.storage': 'Storage',
  'xshopWindow.storageEmpty': 'Your storage is empty.',
  'xshopWindow.use': 'Use',
  'xshopWindow.buy': 'Buy',
  'xshopWindow.gift': 'Gift',
  'xshopWindow.giftOff': 'Gifting is disabled in the X-Shop.',
  'xshopWindow.cancel': 'Cancel',
  'xshopWindow.price': 'Price',
  'xshopWindow.notEnough': 'You do not have enough for this price.',
  'xshopWindow.days': '{count} day(s)',
  'xshopWindow.loading': 'Loading the shop...',
  'xshopWindow.noPackages': 'Nothing on sale here.',
} satisfies Partial<Record<keyof typeof en, string>>;
