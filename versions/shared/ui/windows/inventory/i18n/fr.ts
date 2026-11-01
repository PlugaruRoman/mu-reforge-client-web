/** French text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Inventaire',
  'inventory.close': 'Fermer (I,V)',
  'inventory.repair': 'Réparer (L)',
  'inventory.personalShop': 'Boutique personnelle',
  'inventory.expand': 'Ouvrir l’inventaire étendu (K)',
  'inventory.plateJewelBankTip': 'Déposer et retirer des joyaux',
  'inventory.plateVipTip': 'Acheter ou prolonger un abonnement VIP',
  'inventory.plateCollectionsTip': 'Enregistre des objets dans les collections pour des bonus de compte permanents',
  'inventory.bagClickToBuy': 'Acheter un sac de plus',
  'inventory.bagTitle': 'Sac d\'inventaire',
  'inventory.bagBuyFor': 'Acheter un sac de plus pour {price} {currency}',
  'inventory.bagConfirm': 'Acheter un sac d\'inventaire de plus ?',
  'inventory.bagBuy': 'Acheter',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Points Goblin',
} satisfies Partial<Record<keyof typeof en, string>>;
