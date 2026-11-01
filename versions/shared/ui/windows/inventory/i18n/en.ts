/** English text of the `inventory` window. See src/i18n/readme.md. */

const en = {
  'inventory.title': 'Inventory',
  'inventory.close': 'Close (I,V)',
  'inventory.repair': 'Repair (L)',
  'inventory.personalShop': 'Personal Shop',
  'inventory.expand': 'Open Expanded Inventory (K)',
  'inventory.plateJewelBankTip': 'Store and withdraw jewels',
  'inventory.plateVipTip': 'Buy or extend a VIP subscription',
  'inventory.plateCollectionsTip': 'Register items into collections for permanent account bonuses',
  'inventory.bagClickToBuy': 'Buy one more bag',
  'inventory.bagTitle': 'Inventory bag',
  'inventory.bagBuyFor': 'Buy one more bag for {price} {currency}',
  'inventory.bagConfirm': 'Buy one more inventory bag?',
  'inventory.bagBuy': 'Buy',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Goblin Points',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/inventory': typeof en;
  }
}
