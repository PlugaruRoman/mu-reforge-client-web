/** English text of the `reforge_market` module. See src/i18n/readme.md. */

const en = {
  'reforgeMarket.priceSet': 'The price is set.',
  'reforgeMarket.priceFailed': 'Could not set the price.',
  'reforgeMarket.priceClosed': 'The market is closed.',
  'reforgeMarket.priceItemNotFound': 'The item is no longer there.',
  'reforgeMarket.priceStoreOpen': 'Your store is open: a price can only be lowered while it stays open.',
  'reforgeMarket.priceInvalid': 'Enter a price above zero.',
  'reforgeMarket.priceTooHigh': 'That price is above the limit.',
  'reforgeMarket.priceCurrencyInvalid': 'Unknown currency.',
  'reforgeMarket.priceLevelTooLow': 'Your level is too low to sell.',
  'reforgeMarket.priceNotTradeable': 'This item cannot be sold.',
  'reforgeMarket.buyDone': 'You bought the item.',
  'reforgeMarket.buyFailed': 'The purchase failed.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/reforge_market': typeof en;
  }
}
