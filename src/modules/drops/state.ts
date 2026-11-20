import { makeObservable, observable, runInAction } from 'mobx';
import { PickupItemRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import { Session } from '../session';

/** The names over the drops (ALT) and the pick-up request. */
export const Drops = new (class {
  /** Names over every drop (CNewUINameWindow::m_bShowItemName, toggled by ALT). */
  showDropNames = false;

  toggleDropNames(): void {
    runInAction(() => {
      this.showDropNames = !this.showDropNames;
    });
  }

  /** The drop of the last pickup request: the failure answer names no drop (`SendGetItem`, WSclient.cpp). */
  lastPickupNetId: number | null = null;

  pickupItemRequest(itemNetId: number): void {
    if (Session.isOffline) return;

    this.lastPickupNetId = itemNetId;

    const packet = PickupItemRequestPacket.createPacket();
    packet.ItemId = itemNetId;

    Session.sendToGS(packet.buffer);
  }

  constructor() {
    makeObservable(this, {
      showDropNames: observable,
    });
  }
})();
