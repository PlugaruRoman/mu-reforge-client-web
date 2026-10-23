import { makeAutoObservable } from 'mobx';
import type { Item } from '@/ecs/world';
import { Session } from '../session';
import {
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
  if (item.group === 12 && BANK_JEWELS.some(j => j.packed !== 0 && j.packed === item.num)) return true;
  return (item.lvl ?? 0) === 0 && BANK_JEWELS.some(j => j.group === item.group && j.num === item.num);
}

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

  constructor() {
    makeAutoObservable(this);
  }

  setCounts(counts: number[]): void {
    this.counts = counts;
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
