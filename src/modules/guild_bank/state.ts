import { makeAutoObservable, runInAction } from 'mobx';
import { MuWindows } from '@/controllers/interface/windowManager';
import { prefetchItemIcons } from '@/controllers/assets/itemIconPack';
import { playUiSound } from '@/controllers/sound/sfx';
import { InventoryConstants } from '@/core/inventoryConstants';
import type { Item } from '@/ecs/world';
import { t } from '@/i18n';
import {
  GuildBankCloseRequestPacket,
  GuildBankDepositRequestPacket,
  GuildBankMoneyRequestPacket,
  GuildBankMoveRequestPacket,
  GuildBankPageChangeRequestPacket,
  GuildBankPermissionUpdateRequestPacket,
  GuildBankRemovePasswordRequestPacket,
  GuildBankSetPasswordRequestPacket,
  GuildBankUnlockRequestPacket,
  GuildBankWithdrawRequestPacket,
  GuildCastleWarpRequestPacket,
  GuildSettingsRequestPacket,
} from '@versions/reforge/packets/ClientToServerPackets';
import { addNotification } from '../chat';
import { Session } from '../session';

/** One page of the bank: the vault's 8 x 15 grid (S DataModel/InventoryConstants.cs:182-187). */
export const BANK_COLUMNS = 8;
export const BANK_ROWS = 15;
export const BANK_SLOTS = BANK_COLUMNS * BANK_ROWS;
/** `GuildBankDepositRequest.TargetSlot` 0xFF: the server picks the first free slot. */
export const NO_PREFERRED_SLOT = 0xff;
/** Four digits, not all the same (our client GameLogic/Reforge/ReforgeGuild.h `IsAcceptablePin`). */
export const PIN_DIGITS = 4;

/** `GuildBankLockState.State` (DC 0C). */
export const BankLock = { None: 0, Locked: 1, Unlocked: 2 } as const;
export type BankLock = (typeof BankLock)[keyof typeof BankLock];

/**
 * Our server's `GuildPosition` (S Interfaces/GuildPosition.cs): the bank permission masks carry
 * bit `value` per rank. The guild master always has every right and is not edited.
 */
export const GuildRank = {
  NormalMember: 1,
  GuildMaster: 2,
  BattleMaster: 3,
  AssistantMaster: 4,
  Veteran: 5,
  EliteMember: 6,
  Recruit: 7,
} as const;
/** The ranks the settings grid lists, highest first (ReforgeGuild.h `AssignableRanks`). */
export const ASSIGNABLE_RANKS = [
  GuildRank.AssistantMaster,
  GuildRank.BattleMaster,
  GuildRank.Veteran,
  GuildRank.EliteMember,
  GuildRank.NormalMember,
  GuildRank.Recruit,
] as const;

export type GuildBankPrompt = 'deposit' | 'withdraw' | 'unlock' | 'set-pin' | 'repeat-pin' | 'remove-pin';

export function isAcceptablePin(pin: string): boolean {
  return /^\d{4}$/.test(pin) && !/^(\d)\1{3}$/.test(pin);
}

export const withRank = (mask: number, rank: number, allowed: boolean): number =>
  allowed ? (mask | (1 << rank)) >>> 0 : (mask & ~(1 << rank)) >>> 0;

const emptyGrid = () => new Array<Item | null>(BANK_SLOTS).fill(null);

function send(packet: { buffer: DataView }): void {
  if (Session.isOffline) return;
  Session.sendToGS(packet.buffer);
}

/**
 * The shared guild bank (our client UI/GuildBank/GuildBankWindow.cpp): one page of items the
 * server sends whole after every change, the zen every page shares, the PIN state and the page.
 * Plus the guild settings (per-rank bank rights, DC 0D / 0E) and the castle warp (DC 0F).
 */
export const GuildBank = new (class {
  open = false;
  items: (Item | null)[] = emptyGrid();
  money = 0;
  canWithdraw = false;
  lock: BankLock = BankLock.None;
  page = 0;
  pageCount = 1;
  /** A bank item chosen for a rearrange: the next click on a free square moves it there (DC 10). */
  selected: number | null = null;
  prompt: GuildBankPrompt | null = null;
  /** The first PIN typed while setting one, waiting for the repeat. */
  pendingPin = '';

  settingsOpen = false;
  /** The server's stored masks (`GuildSettingsResponse`) and the grid being edited. */
  confirmedDeposit = 0;
  confirmedWithdraw = 0;
  depositFlags = 0;
  withdrawFlags = 0;
  settingsSaved = false;

  /** `GuildCastleWarpState`: the guild owns the castle, the guild window shows its Castle button. */
  ownsCastle = false;

  constructor() {
    makeAutoObservable(this);
  }

  get locked(): boolean {
    return this.lock === BankLock.Locked;
  }

  // ---- the server's reports ---------------------------------------------------

  /** DC 08: sent first when the Guild Master NPC opens a session, and after each page change. */
  pageInfo(current: number, count: number): void {
    const opening = !this.open;
    runInAction(() => {
      this.pageCount = Math.max(1, count);
      this.page = Math.min(Math.max(0, current), this.pageCount - 1);
      this.selected = null;
      if (opening) {
        this.open = true;
        MuWindows.setOpen('inventory', true);
      }
    });
  }

  /** DC 0C: a locked bank hides its contents and asks for the PIN (GuildBankWindow.cpp `SetLock`). */
  lockState(state: number): void {
    if (!this.open) return;
    runInAction(() => {
      this.lock = state === BankLock.Locked || state === BankLock.Unlocked ? state : BankLock.None;
      if (this.lock === BankLock.Locked) {
        this.items = emptyGrid();
        this.selected = null;
        this.prompt = 'unlock';
      } else if (this.prompt === 'unlock') {
        this.prompt = null;
      }
    });
  }

  /** DC 01: the active page's items, the shared zen and the hero's withdraw right. */
  contents(money: number, canWithdraw: boolean, entries: { slot: number; item: Item }[]): void {
    if (!this.open) return;
    runInAction(() => {
      const items = emptyGrid();
      for (const { slot, item } of entries) if (slot >= 0 && slot < BANK_SLOTS) items[slot] = item;
      this.items = items;
      this.money = money;
      this.canWithdraw = canWithdraw;
      this.selected = null;
    });
    prefetchItemIcons(this.items);
  }

  // ---- the hero's actions -----------------------------------------------------

  /**
   * DC 03: the inventory item at `inventorySlot` into the bank (`DropHeldItem`). Worn items are
   * refused here as the server would. The item stays in the bag until the server's ItemRemoved.
   */
  deposit(inventorySlot: number, targetSlot: number = NO_PREFERRED_SLOT): boolean {
    if (!this.open || this.locked) return false;
    if (inventorySlot < InventoryConstants.EquippableSlotsCount) {
      addNotification(t('guildBank.takeOffFirst'), 'error');
      return false;
    }
    const packet = GuildBankDepositRequestPacket.createPacket();
    packet.InventorySlot = inventorySlot;
    packet.TargetSlot = targetSlot;
    send(packet);
    playUiSound('getItem');
    return true;
  }

  /** DC 04: the bank item at `slot` into the inventory; the server picks the square (`WithdrawAtPointer`). */
  withdraw(slot: number): void {
    if (!this.open || this.locked || !this.canWithdraw || !this.items[slot]) return;
    const packet = GuildBankWithdrawRequestPacket.createPacket();
    packet.BankSlot = slot;
    send(packet);
    playUiSound('getItem');
  }

  select(slot: number | null): void {
    this.selected = slot !== null && this.canWithdraw && !this.locked && this.items[slot] ? slot : null;
  }

  /** DC 10: the selected item to `targetSlot` of the same page; needs the withdraw right. */
  moveSelected(targetSlot: number): void {
    const source = this.selected;
    this.selected = null;
    if (source === null || source === targetSlot || !this.canWithdraw || this.locked) return;
    const packet = GuildBankMoveRequestPacket.createPacket();
    packet.SourceSlot = source;
    packet.TargetSlot = targetSlot;
    send(packet);
    playUiSound('getItem');
  }

  /** DC 05: zen in (deposit) or out; the server answers with the list and the bag's zen. */
  moveMoney(deposit: boolean, amount: number): void {
    if (!this.open || this.locked || amount <= 0) return;
    if (!deposit && !this.canWithdraw) return;
    const packet = GuildBankMoneyRequestPacket.createPacket();
    packet.Direction = deposit ? 0 : 1;
    packet.Amount = Math.min(amount, 0xffffffff);
    send(packet);
  }

  /** DC 07: the server answers with DC 08 and the page's DC 01. */
  changePage(delta: number): void {
    const target = this.page + delta;
    if (!this.open || this.locked || target < 0 || target >= this.pageCount) return;
    const packet = GuildBankPageChangeRequestPacket.createPacket();
    packet.Page = target;
    send(packet);
    playUiSound('click');
  }

  unlock(pin: string): void {
    const packet = GuildBankUnlockRequestPacket.createPacket();
    packet.Pin = Number(pin);
    send(packet);
  }

  setPin(pin: string): void {
    const packet = GuildBankSetPasswordRequestPacket.createPacket();
    packet.Pin = Number(pin);
    send(packet);
  }

  removePin(): void {
    send(GuildBankRemovePasswordRequestPacket.createPacket());
  }

  openPrompt(prompt: GuildBankPrompt | null): void {
    this.prompt = prompt;
  }

  /** DC 06 on a close by the hero; `notify` false when the session is gone anyway. */
  close(notify = true): void {
    if (!this.open) return;
    if (notify) send(GuildBankCloseRequestPacket.createPacket());
    runInAction(() => {
      this.open = false;
      this.items = emptyGrid();
      this.money = 0;
      this.canWithdraw = false;
      this.lock = BankLock.None;
      this.page = 0;
      this.pageCount = 1;
      this.selected = null;
      this.prompt = null;
      this.pendingPin = '';
    });
  }

  // ---- guild settings (GuildSettingsWindow.cpp) -------------------------------

  openSettings(open: boolean): void {
    this.settingsOpen = open;
    this.settingsSaved = false;
    if (open) send(GuildSettingsRequestPacket.createPacket());
  }

  /** DC 0D: the stored masks, the grid's baseline; "saved" when it answers our DC 0E. */
  settings(deposit: number, withdraw: number): void {
    this.confirmedDeposit = this.depositFlags = deposit >>> 0;
    this.confirmedWithdraw = this.withdrawFlags = withdraw >>> 0;
    this.settingsSaved = this.awaitingSave;
    this.awaitingSave = false;
  }

  awaitingSave = false;

  get settingsDirty(): boolean {
    return this.depositFlags !== this.confirmedDeposit || this.withdrawFlags !== this.confirmedWithdraw;
  }

  toggleRight(rank: number, withdraw: boolean): void {
    if (withdraw) this.withdrawFlags = withRank(this.withdrawFlags, rank, !(this.withdrawFlags & (1 << rank)));
    else this.depositFlags = withRank(this.depositFlags, rank, !(this.depositFlags & (1 << rank)));
    this.settingsSaved = false;
  }

  revertSettings(): void {
    this.depositFlags = this.confirmedDeposit;
    this.withdrawFlags = this.confirmedWithdraw;
  }

  /** DC 0E: guild master only; the server answers with DC 0D. */
  saveSettings(): void {
    const packet = GuildBankPermissionUpdateRequestPacket.createPacket();
    packet.DepositRankFlags = this.depositFlags;
    packet.WithdrawRankFlags = this.withdrawFlags;
    this.awaitingSave = true;
    send(packet);
  }

  // ---- castle warp (DC 0F) ----------------------------------------------------

  /** Action 0: the guild window opened, ask whether the guild owns the castle. */
  askCastle(): void {
    this.ownsCastle = false;
    const packet = GuildCastleWarpRequestPacket.createPacket();
    packet.Action = 0;
    send(packet);
  }

  castleOwner(owner: boolean): void {
    this.ownsCastle = owner;
  }

  /** Action 1: into the castle keep; the server refuses during the siege and says why. */
  warpToCastle(): void {
    if (!this.ownsCastle) return;
    const packet = GuildCastleWarpRequestPacket.createPacket();
    packet.Action = 1;
    send(packet);
  }
})();
