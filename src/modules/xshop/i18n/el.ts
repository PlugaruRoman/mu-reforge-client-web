/** el text of the `xshop` module. */

import type en from './en';

export default {
  'xshop.buy.done': 'Purchase completed. The item is in your shop storage.',
  'xshop.buy.noMoney': 'Purchase failed: you do not have enough W Coin or points.',
  'xshop.buy.noSpace': 'Purchase failed: you do not have enough space in the storage.',
  'xshop.buy.soldOut': 'Purchase failed: this item has sold out.',
  'xshop.buy.notAvailable': 'Purchase failed: this item is not currently available.',
  'xshop.buy.noLonger': 'Purchase failed: this item is no longer available.',
  'xshop.buy.cannot': 'Purchase failed: this item cannot be bought.',
  'xshop.buy.event': 'Purchase failed: event items cannot be bought.',
  'xshop.buy.eventLimit': 'Purchase failed: you have bought this event item too many times.',
  'xshop.buy.wrongCoin': 'Purchase failed: wrong W Coin type, please select again.',
  'xshop.buy.database': 'Purchase failed: a database error has occurred.',
  'xshop.use.done': 'The item has been used.',
  'xshop.use.missing': 'Failed to use: the item is no longer in the storage.',
  'xshop.use.noSpace': 'Failed to use: not enough space, please free some space in your inventory.',
  'xshop.use.cannot': 'Failed to use: the selected item cannot be used.',
  'xshop.use.conflict': 'Failed to use: it cannot be used along with an item that is already in use.',
  'xshop.use.error': 'Failed to use: there has been an error.',
  'xshop.unknownError': 'Unknown error.',
  'xshop.expiration': 'Expiration date:',
  'xshop.expired': 'Expired item',
} satisfies Partial<Record<keyof typeof en, string>>;
