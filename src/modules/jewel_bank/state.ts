import { makeAutoObservable } from 'mobx';
import type { Item } from '@/ecs/world';
import { InventoryConstants } from '@/core/inventoryConstants';
import { Session } from '../session';
import {
  JewelBankDepositAllRequestPacket,
  JewelBankDepositRequestPacket,
  JewelBankListRequestPacket,
  JewelBankWithdrawRequestPacket,
} from '@versions/reforge/packets/ClientToServerPackets';

/** The window's id (`versions/shared/ui/windows/jewel_bank/window.ts`). */
export const JEWEL_BANK_WINDOW = 'jewel_bank';

/**
 * The bank's jewels in JewelBankItemType order (S GameLogic/JewelBank/JewelBankItemTypeExtensions.cs
 * `ItemIds`): the loose jewel, and the packed bundle of group 12 the server's jewel mix makes (0 for
 * none; our client's ReforgeJewelBank.cpp `Jewels`).
 */
export const BANK_JEWELS: readonly { readonly group: number; readonly num: number; readonly packed: number }[] = [
  { group: 14, num: 13, packed: 30 }, // Bless
  { group: 14, num: 14, packed: 31 }, // Soul
  { group: 14, num: 16, packed: 136 }, // Life
  { group: 14, num: 22, packed: 137 }, // Creation
  { group: 14, num: 31, packed: 138 }, // Guardian
  { group: 14, num: 41, packed: 139 }, // Gemstone
  { group: 14, num: 42, packed: 140 }, // Harmony
  { group: 12, num: 15, packed: 141 }, // Chaos
  { group: 14, num: 43, packed: 142 }, // Lower Refining Stone
  { group: 14, num: 44, packed: 143 }, // Higher Refining Stone
  { group: 14, num: 124, packed: 0 }, // Jewel of Skill
  { group: 14, num: 125, packed: 0 }, // Jewel of Luck
  { group: 14, num: 176, packed: 0 }, // Jewel of Sea
  { group: 14, num: 157, packed: 0 }, // Jewel of Chaos Assembly
  { group: 14, num: 178, packed: 0 }, // Ancient Soul Stone (banked, but no market price currency)
];
export const JEWEL_COUNT = BANK_JEWELS.length;

/** The amounts one withdrawal can take (ReforgeJewelBank.h `WithdrawAmounts`). */
export const WITHDRAW_AMOUNTS = [1, 10, 20, 30] as const;

/** The server's deposit sources (our client's JewelBankPackets.h `JewelBankSource`). */
export enum JewelBankSource {
  Inventory = 0,
  Vault = 2,
}

/** A loose jewel of level 0, or a packed bundle of one: what the server takes (`IsDepositable`). */
export function isDepositable(item: Pick<Item, 'group' | 'num' | 'lvl'>): boolean {
  if (isPackedJewel(item)) return true;
  return (item.lvl ?? 0) === 0 && BANK_JEWELS.some(j => j.group === item.group && j.num === item.num);
}

/** Whether the item is a packed bundle of a bank jewel (group 12). */
function isPackedJewel(item: Pick<Item, 'group' | 'num'>): boolean {
  return item.group === 12 && BANK_JEWELS.some(j => j.packed !== 0 && j.packed === item.num);
}

/**
 * The jewels the bank credits for the item: 1 for a loose jewel, 10/20/30 for a bundle of level 0/1/2
 * (S JewelBankAction `TryGetDeposit`), 0 when the bank does not take it.
 */
export function depositAmount(item: Pick<Item, 'group' | 'num' | 'lvl'>): number {
  if (!isDepositable(item)) return 0;
  return isPackedJewel(item) ? ((item.lvl ?? 0) + 1) * 10 : 1;
}

/**
 * The jewels "store all" would put into the bank: every jewel and bundle of the inventory and its
 * bags - never the equipment (slots 0-11) or the personal store (from slot 204), which the server
 * leaves alone as well. `items` is the hero's items by wire slot (`Hero.items`).
 */
export function inventoryJewels(items: readonly (Item | null | undefined)[]): number {
  let jewels = 0;
  const end = Math.min(items.length, InventoryConstants.FirstStoreItemSlotIndex);
  for (let slot = InventoryConstants.EquippableSlotsCount; slot < end; slot++) {
    const item = items[slot];
    if (item) jewels += depositAmount(item);
  }
  return jewels;
}

/** How long a "store all" waits for the server's list before the button works again (ms). */
export const STORE_ALL_WAIT = 3000;

/**
 * C1 D3 01 (S ServerToClientPackets.xml `JewelBankList`): a u32 count per jewel from byte 4. The
 * declared length bounds them; a shorter list leaves the missing jewels at 0 (ParseJewelBankList).
 */
export function parseJewelBankList(packet: DataView): number[] | null {
  const length = Math.min(packet.byteLength, packet.getUint8(1));
  if (length < 8) return null;
  const sent = Math.min(JEWEL_COUNT, Math.floor((length - 4) / 4));
  return Array.from({ length: JEWEL_COUNT }, (_, i) => (i < sent ? packet.getUint32(4 + i * 4, true) : 0));
}

/** Our client's jewel bank (UI/JewelBank/JewelBankWindow.cpp, JewelBankDeposit.cpp) without its drawing. */
export const JewelBank = new (class {
  counts: number[] = new Array<number>(JEWEL_COUNT).fill(0);
  amountIndex = 0;
  /** A "store all" waits for the server's answer, so a double click sends one request. */
  storeAllPending = false;
  private storeAllTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable<this, 'storeAllTimer'>(this, { storeAllTimer: false });
  }

  setCounts(counts: number[]): void {
    this.counts = counts;
    this.endStoreAllWait();
  }

  /**
   * C1 D3 05: the server stores every jewel of the inventory and its bags (our client's
   * JewelBankDeposit.cpp `TryDepositAllFromInventory`). Nothing is sent while an item is held or a
   * move is on its way (`busy`) - the server would delete a jewel the cursor still shows - while the
   * last press is unanswered, or when there is nothing to store.
   */
  depositAll(items: readonly (Item | null | undefined)[], busy: boolean): boolean {
    if (busy || this.storeAllPending || inventoryJewels(items) === 0) return false;
    Session.sendToGS(JewelBankDepositAllRequestPacket.createPacket().buffer);
    this.storeAllPending = true;
    // An answer which stored nothing (a refusal, nothing left) sends no list: the wait ends anyway.
    this.storeAllTimer = setTimeout(() => this.endStoreAllWait(), STORE_ALL_WAIT);
    return true;
  }

  endStoreAllWait(): void {
    if (this.storeAllTimer !== null) clearTimeout(this.storeAllTimer);
    this.storeAllTimer = null;
    this.storeAllPending = false;
  }

  selectAmount(index: number): void {
    if (index >= 0 && index < WITHDRAW_AMOUNTS.length) this.amountIndex = index;
  }

  get amount(): number {
    return WITHDRAW_AMOUNTS[this.amountIndex];
  }

  canWithdraw(jewel: number, amount = this.amount): boolean {
    return jewel >= 0 && jewel < JEWEL_COUNT && amount > 0 && (this.counts[jewel] ?? 0) >= amount;
  }

  /** C1 D3 02. */
  requestList(): void {
    Session.sendToGS(JewelBankListRequestPacket.createPacket().buffer);
  }

  /** C1 D3 04 `[jewel][amount]`. */
  withdraw(jewel: number): boolean {
    if (!this.canWithdraw(jewel)) return false;
    const packet = JewelBankWithdrawRequestPacket.createPacket();
    packet.JewelType = jewel;
    packet.Amount = this.amount;
    Session.sendToGS(packet.buffer);
    return true;
  }

  /** C1 D3 03 `[slot][source]`: the jewel in that bag slot goes to the bank. */
  deposit(slot: number, item: Pick<Item, 'group' | 'num' | 'lvl'>, source = JewelBankSource.Inventory): boolean {
    if (slot < 0 || slot > 0xff || !isDepositable(item)) return false;
    const packet = JewelBankDepositRequestPacket.createPacket();
    packet.InventorySlot = slot;
    packet.SourceStorage = source;
    Session.sendToGS(packet.buffer);
    return true;
  }
})();
