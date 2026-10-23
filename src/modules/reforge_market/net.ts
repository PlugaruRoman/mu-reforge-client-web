import { EventBus } from '@/core/eventBus';
import { t, type TextKey } from '@/i18n';
import { addNotification } from '../chat';
import { parseOpen, parsePriceAnswer, parseSearchPage, parseStoreCurrencies } from './codec';
import { PriceResult } from './rules';
import { ReforgeMarket } from './state';

/** MarketPriceResult -> its line (our client's "Store price ..." texts, UI/Reforge/ReforgeStorePrice.cpp). */
const PRICE_TEXT: Record<number, TextKey> = {
  [PriceResult.Success]: 'reforgeMarket.priceSet',
  [PriceResult.MarketDisabled]: 'reforgeMarket.priceClosed',
  [PriceResult.ItemNotFound]: 'reforgeMarket.priceItemNotFound',
  [PriceResult.StoreOpen]: 'reforgeMarket.priceStoreOpen',
  [PriceResult.PriceInvalid]: 'reforgeMarket.priceInvalid',
  [PriceResult.PriceTooHigh]: 'reforgeMarket.priceTooHigh',
  [PriceResult.CurrencyInvalid]: 'reforgeMarket.priceCurrencyInvalid',
  [PriceResult.LevelTooLow]: 'reforgeMarket.priceLevelTooLow',
  [PriceResult.ItemNotTradeable]: 'reforgeMarket.priceNotTradeable',
};

/** Registers this module's packet listeners (see ../module.ts). Our client: Network/Reforge/MarketPackets.cpp. */
export function installNet(): void {
  // E8 05: talking to the market keeper (S PlayerActions/Market/MarketNpcTalkPlugIn.cs, NPC 568)
  // opens the board; Result 1 only carries the price ceilings (entering the world, opening a store).
  EventBus.on('MarketOpenResponse', packet => {
    const open = parseOpen(packet);
    if (!open) return;
    ReforgeMarket.setLimits(open.limits);
    if (open.openWindow) ReforgeMarket.open();
  });

  EventBus.on('MarketSearchResponse', packet => {
    const page = parseSearchPage(packet);
    if (page) ReforgeMarket.searchArrived(page);
  });

  EventBus.on('MarketTeleportResponse', packet => {
    if (packet.byteLength >= 5) ReforgeMarket.teleportAnswered(packet.getUint8(4));
  });

  // E8 03: set from the personal store's price dialog in our client; a line either way.
  EventBus.on('MarketPriceResponse', packet => {
    const answer = parsePriceAnswer(packet);
    if (!answer) return;
    const ok = answer.result === PriceResult.Success;
    addNotification(t(PRICE_TEXT[answer.result] ?? 'reforgeMarket.priceFailed'), ok ? 'info' : 'error');
  });

  // E8 02: our server buys nothing through the market (MarketViewPlugIn has no writer for it); kept as a line.
  EventBus.on('MarketBuyResponse', packet => {
    if (packet.byteLength < 5) return;
    const ok = packet.getUint8(4) === 0;
    addNotification(t(ok ? 'reforgeMarket.buyDone' : 'reforgeMarket.buyFailed'), ok ? 'info' : 'error');
  });

  EventBus.on('MarketStoreCurrencies', packet => ReforgeMarket.setStoreCurrencies(parseStoreCurrencies(packet)));
}
