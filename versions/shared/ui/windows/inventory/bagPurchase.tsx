import { useEffect } from 'react';
import { observable, reaction, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { moduleOn } from '@/modules/module';
import { Bag } from '@/modules/inventory';
import { XShop, requestBagPrice } from '@/modules/xshop';
import { sendChatLine } from '@/modules/chat/sendLine';
import { AccountConfirm, amount } from '../_shared/accountWidgets';

/**
 * Our client's purchase of one more inventory bag (UI/Reforge/ReforgeInventoryExtensionPurchase.cpp):
 * a click asks the server for the price (D2 60), only its answer opens the confirmation, and Buy sends
 * the server's `/buyinvbag`, which checks and charges. Here the inventory's Expand button is that
 * click, on a world with our cash shop.
 */
const BUY_COMMAND = '/buyinvbag';

/** D2 60's currency byte (InventoryExtensionPackets.h `InventoryExtensionCurrency`). */
const GOBLIN_POINTS = 2;

/** A click asked for the price; the next answer opens the confirmation. */
let priceRequested = false;
const offer = observable.box<{ price: number; currency: number } | null>(null);

export const bagPurchaseOn = (): boolean => moduleOn('xshop');

/** `OnLockedBagClicked`: never while an item is held, since that click is placing it. */
export function askBagPrice(): void {
  if (Bag.pickedItem) return;
  priceRequested = true;
  requestBagPrice();
}

const closeOffer = () => runInAction(() => offer.set(null));

/** The confirmation over the inventory, while an asked-for price is in. */
export const BagPurchaseConfirm = observer(() => {
  useEffect(
    () =>
      // A fresh object per answer, so the same price twice still opens it.
      reaction(
        () => XShop.bagPrice,
        price => {
          if (!priceRequested || !price) return;
          priceRequested = false;
          runInAction(() => offer.set(price));
        }
      ),
    []
  );
  useEffect(() => closeOffer, []);

  const price = offer.get();
  if (!price) return null;
  const currency = t(
    price.currency === GOBLIN_POINTS
      ? 'inventory.bagGoblinPoints'
      : 'inventory.bagWCoin'
  );
  return (
    <div className="reforge-confirm-text">
      <AccountConfirm
        lines={[
          { text: t('inventory.bagTitle'), bold: true },
          {
            text: t('inventory.bagBuyFor', {
              price: amount(price.price),
              currency,
            }),
            color: '#ffd927',
          },
          { text: t('inventory.bagConfirm') },
        ]}
        buttons={[
          {
            label: t('inventory.bagBuy'),
            onClick: () => {
              closeOffer();
              sendChatLine(BUY_COMMAND);
            },
          },
          { label: t('common.cancel'), onClick: closeOffer },
        ]}
      />
    </div>
  );
});
