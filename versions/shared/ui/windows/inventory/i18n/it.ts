/** Italian text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Inventario',
  'inventory.close': 'Chiudi (I,V)',
  'inventory.repair': 'Ripara (L)',
  'inventory.personalShop': 'Negozio personale',
  'inventory.expand': 'Apri l’inventario esteso (K)',
  'inventory.plateJewelBankTip': 'Deposita e preleva gioielli',
  'inventory.plateVipTip': 'Acquista o estendi un abbonamento VIP',
  'inventory.plateCollectionsTip': 'Registra oggetti nelle collezioni per bonus permanenti dell\'account',
  'inventory.bagClickToBuy': 'Acquista un\'altra borsa',
  'inventory.bagTitle': 'Borsa dell\'inventario',
  'inventory.bagBuyFor': 'Acquista un\'altra borsa per {price} {currency}',
  'inventory.bagConfirm': 'Acquistare un\'altra borsa dell\'inventario?',
  'inventory.bagBuy': 'Acquista',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Punti Goblin',
} satisfies Partial<Record<keyof typeof en, string>>;
