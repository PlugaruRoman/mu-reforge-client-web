/** Portuguese text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Inventário',
  'inventory.close': 'Fechar (I,V)',
  'inventory.repair': 'Reparar (L)',
  'inventory.personalShop': 'Loja pessoal',
  'inventory.expand': 'Abrir o inventário estendido (K)',
  'inventory.plateJewelBankTip': 'Guarde e retire joias',
  'inventory.plateVipTip': 'Compre ou prolongue uma assinatura VIP',
  'inventory.plateCollectionsTip': 'Registre itens em coleções para bônus permanentes de conta',
  'inventory.bagClickToBuy': 'Comprar mais uma bolsa',
  'inventory.bagTitle': 'Bolsa do inventário',
  'inventory.bagBuyFor': 'Comprar mais uma bolsa por {price} {currency}',
  'inventory.bagConfirm': 'Comprar mais uma bolsa do inventário?',
  'inventory.bagBuy': 'Comprar',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Pontos Goblin',
} satisfies Partial<Record<keyof typeof en, string>>;
