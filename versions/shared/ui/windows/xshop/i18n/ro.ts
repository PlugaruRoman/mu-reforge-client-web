/** Romanian text of the `xshop` window. */

import type en from './en';

export default {
  'xshopWindow.title': 'X-Shop',
  'xshopWindow.wcoinC': 'W Coin (C)',
  'xshopWindow.wcoinP': 'W Coin (P)',
  'xshopWindow.goblin': 'Puncte Goblin',
  'xshopWindow.storage': 'Depozit',
  'xshopWindow.storageEmpty': 'Depozitul este gol.',
  'xshopWindow.use': 'Folosește',
  'xshopWindow.buy': 'Cumpără',
  'xshopWindow.gift': 'Cadou',
  'xshopWindow.giftOff': 'Cadourile sunt dezactivate în X-Shop.',
  'xshopWindow.cancel': 'Anulează',
  'xshopWindow.price': 'Preț',
  'xshopWindow.notEnough': 'Nu ai destul pentru acest preț.',
  'xshopWindow.days': '{count} zi(le)',
  'xshopWindow.loading': 'Se încarcă magazinul...',
  'xshopWindow.noPackages': 'Nimic de vânzare aici.',
} satisfies Partial<Record<keyof typeof en, string>>;
