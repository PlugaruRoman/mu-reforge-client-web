/** Romanian text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Inventar',
  'inventory.close': 'Închide (I,V)',
  'inventory.repair': 'Repară (L)',
  'inventory.personalShop': 'Magazin personal',
  'inventory.expand': 'Deschide inventarul extins (K)',
  'inventory.plateJewelBankTip': 'Depune și retrage bijuterii',
  'inventory.plateVipTip': 'Cumpără sau prelungește un abonament VIP',
  'inventory.plateCollectionsTip': 'Înregistrează obiecte în colecții pentru bonusuri permanente de cont',
  'inventory.bagClickToBuy': 'Cumpără încă o geantă',
  'inventory.bagTitle': 'Geantă de inventar',
  'inventory.bagBuyFor': 'Cumpără încă o geantă pentru {price} {currency}',
  'inventory.bagConfirm': 'Cumperi încă o geantă de inventar?',
  'inventory.bagBuy': 'Cumpără',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Puncte Goblin',
} satisfies Partial<Record<keyof typeof en, string>>;
