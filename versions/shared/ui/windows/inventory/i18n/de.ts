/** German text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Inventar',
  'inventory.close': 'Schließen (I,V)',
  'inventory.repair': 'Reparieren (L)',
  'inventory.personalShop': 'Eigener Laden',
  'inventory.expand': 'Erweitertes Inventar öffnen (K)',
  'inventory.plateJewelBankTip': 'Juwelen einlagern und abheben',
  'inventory.plateVipTip': 'Ein VIP-Abo kaufen oder verlängern',
  'inventory.plateCollectionsTip': 'Gegenstände in Sammlungen eintragen für dauerhafte Kontoboni',
  'inventory.bagClickToBuy': 'Eine weitere Tasche kaufen',
  'inventory.bagTitle': 'Inventartasche',
  'inventory.bagBuyFor': 'Eine weitere Tasche für {price} {currency} kaufen',
  'inventory.bagConfirm': 'Eine weitere Inventartasche kaufen?',
  'inventory.bagBuy': 'Kaufen',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Goblin-Punkte',
} satisfies Partial<Record<keyof typeof en, string>>;
