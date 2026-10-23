import { observable, runInAction } from 'mobx';
import type { Item } from '@/ecs/world';
import { t } from '@/i18n';

/**
 * Rental items (`KJH_ADD_PERIOD_ITEM_SYSTEM`): D2 11 says how many D2 12 follow, each one an inventory slot,
 * the item code there and its expiry (S RemoteView/Inventory/PeriodItemViewPlugIn.cs). Our client keeps the
 * expiry on the item at that slot (`ReceivePeriodItemList`, WSclient.cpp:13217) and the tooltip ends with
 * "Expiration date:" and the local date (`RenderItemInfo`, ZzzInventory.cpp:5127-5144).
 */
const rentals = observable.map<number, { itemCode: number; expires: number }>();

/** D2 11: a new list follows, the old one is gone. */
export function periodItemsCounted(): void {
  rentals.clear();
}

/** D2 12: `expires` in unix seconds. */
export function periodItemArrived(slot: number, itemCode: number, expires: number): void {
  runInAction(() => rentals.set(slot, { itemCode, expires }));
}

export function forgetPeriodItems(): void {
  rentals.clear();
}

/** When the item at inventory `slot` expires, or null when it is no rental (the code must match the item). */
export function periodItemExpiry(slot: number, item: Item): Date | null {
  const rental = rentals.get(slot);
  if (!rental || rental.expires <= 0 || rental.itemCode !== item.group * 512 + item.num) return null;
  return new Date(rental.expires * 1000);
}

const two = (n: number) => String(n).padStart(2, '0');

/** `%d-%02d-%02d  %02d:%02d` in local time, as our client prints it. */
export function formatExpiry(date: Date): string {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}  ${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** The tooltip's closing lines for a rental: the label in orange, the date in blue; expired in red. */
export function periodItemLines(slot: number, item: Item): { text: string; color: 'orange' | 'blue' | 'red' }[] {
  const expiry = periodItemExpiry(slot, item);
  if (!expiry) return [];
  if (expiry.getTime() <= Date.now()) return [{ text: t('xshop.expired'), color: 'red' }];
  return [
    { text: t('xshop.expiration'), color: 'orange' },
    { text: formatExpiry(expiry), color: 'blue' },
  ];
}
