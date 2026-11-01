/** Polish text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Ekwipunek',
  'inventory.close': 'Zamknij (I,V)',
  'inventory.repair': 'Napraw (L)',
  'inventory.personalShop': 'Sklep osobisty',
  'inventory.expand': 'Otwórz rozszerzony ekwipunek (K)',
  'inventory.plateJewelBankTip': 'Przechowuj i wypłacaj klejnoty',
  'inventory.plateVipTip': 'Kup lub przedłuż subskrypcję VIP',
  'inventory.plateCollectionsTip': 'Rejestruj przedmioty w kolekcjach, by zdobyć stałe bonusy konta',
  'inventory.bagClickToBuy': 'Kup jeszcze jedną torbę',
  'inventory.bagTitle': 'Torba ekwipunku',
  'inventory.bagBuyFor': 'Kup jeszcze jedną torbę za {price} {currency}',
  'inventory.bagConfirm': 'Kupić jeszcze jedną torbę ekwipunku?',
  'inventory.bagBuy': 'Kup',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Punkty Goblina',
} satisfies Partial<Record<keyof typeof en, string>>;
