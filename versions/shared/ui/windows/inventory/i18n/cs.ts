/** cs text of `versions/shared/ui/windows/inventory`. */

import type en from './en';

export default {
  'inventory.title': 'Inventář',
  'inventory.close': 'Zavřít (I,V)',
  'inventory.repair': 'Opravit (L)',
  'inventory.personalShop': 'Osobní obchod',
  'inventory.expand': 'Otevřít rozšířený inventář (K)',
  'inventory.plateJewelBankTip': 'Ukládej a vybírej klenoty',
  'inventory.plateVipTip': 'Kup nebo prodluž VIP předplatné',
  'inventory.plateCollectionsTip': 'Zapisuj předměty do sbírek pro trvalé bonusy účtu',
  'inventory.bagClickToBuy': 'Koupit další tašku',
  'inventory.bagTitle': 'Taška inventáře',
  'inventory.bagBuyFor': 'Koupit další tašku za {price} {currency}',
  'inventory.bagConfirm': 'Koupit další tašku inventáře?',
  'inventory.bagBuy': 'Koupit',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Goblin body',
} satisfies Partial<Record<keyof typeof en, string>>;
