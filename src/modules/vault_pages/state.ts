import { makeAutoObservable } from 'mobx';
import { Economy } from '../economy/economy';
import { Bag } from '../inventory';
import { Session } from '../session';
import { playUiSound } from '@/controllers/sound';
import { VaultPageChangeRequestPacket } from '@versions/reforge/packets/ClientToServerPackets';

/**
 * The paged vault of Mu Reforge (S GameLogic/PlayerActions/Vault/VaultPageAction.cs): several 8x15
 * pages, only the active one on the client. Our client's GameLogic/Reforge/ReforgeVaultPages.h and
 * UI/Reforge/ReforgeVaultPages.cpp.
 */
export const VaultPages = new (class {
  /** Zero-based active page. */
  current = 0;
  /** Pages the server reports; 0 until the first `VaultPageInfo`. */
  count = 0;

  constructor() {
    makeAutoObservable(this);
  }

  /** `VaultPageInfo` (C2 DD 00): a current page outside the count is ignored (`SetPageInfo`). */
  setInfo(current: number, count: number): void {
    if (current >= count) return;
    this.current = current;
    this.count = count;
  }

  reset(): void {
    this.current = 0;
    this.count = 0;
  }

  /** More than one page: the window shows the arrows (`IsPaged`). */
  get paged(): boolean {
    return this.count > 1;
  }

  get hasPrev(): boolean {
    return this.paged && this.current > 0;
  }

  get hasNext(): boolean {
    return this.paged && this.current + 1 < this.count;
  }

  /**
   * `RequestPage` (ReforgeVaultPages.cpp): nothing in hand or on its way, and a locked vault opened
   * with its pin, else the server refuses. The new page's items come without a clear, so the grid
   * is emptied here; the server answers with StoreItemList, VaultMoneyUpdate and VaultPageInfo.
   */
  request(delta: -1 | 1): boolean {
    const page = this.current + delta;
    if (!Economy.vaultOpen || page < 0 || page >= this.count) return false;
    if (Bag.pickedItem || Bag.pendingItemMove) return false;
    if (Economy.vaultLocked && !Economy.vaultUnlocked) return false;

    Economy.setVaultItems([]);
    const packet = VaultPageChangeRequestPacket.createPacket();
    packet.VaultPage = page;
    Session.sendToGS(packet.buffer);
    playUiSound('click');
    return true;
  }
})();
