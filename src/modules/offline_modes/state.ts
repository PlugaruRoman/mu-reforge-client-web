import { makeAutoObservable } from 'mobx';
import { MuWindows } from '@/controllers/interface';
import { sendChatLine } from '../chat/sendLine';
import { Economy } from '../economy/economy';
import { saveMuHelperConfig } from '../mu_helper/state';
import { SessionResume } from '../session/sessionResume';

/**
 * Our server's offline hand-overs (UI/Reforge/ReforgeMuHelperOptions.cpp, ReforgeOffStore.cpp):
 * `/offlevel` leaves the game and lets the character keep hunting with the MU Helper settings
 * (OfflineLevelingChatCommandPlugIn), `/offstore` leaves the store open (OfflineStoreChatCommandPlugIn).
 * The server disconnects on purpose, so the resume must not log straight back in and take the
 * offline session over again (`UI::Logout::BeginSilent`).
 */
export const OfflineModes = new (class _OfflineModes {
  /** The OFF store button asked; the confirmation box is up. */
  confirmStore: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /** `StartOffExp`: the offline session loads the stored configuration, so it is saved first (that closes the window). */
  offLevel(): void {
    saveMuHelperConfig();
    SessionResume.forget();
    sendChatLine('/offlevel');
  }

  /** `Start`: a title and every price first (`startSelling` says which is missing), then the confirmation. */
  askOffStore(title: string): void {
    const name = title.trim();
    if (!Economy.myShopSelling && (!name || !Economy.myShopItems.some(Boolean) || Economy.shopHasUnpricedItems)) {
      Economy.startSelling(name);
      return;
    }
    this.confirmStore = name;
  }

  cancelOffStore(): void {
    this.confirmStore = null;
  }

  /** `HandOver`: opens the store first (the server reads in order and refuses a closed one), then the command. */
  offStore(): void {
    const name = this.confirmStore;
    this.confirmStore = null;
    if (name === null) return;
    if (!Economy.myShopSelling) Economy.startSelling(name);
    SessionResume.forget();
    sendChatLine('/offstore');
    Economy.closeMyShop();
    MuWindows.setOpen('inventory', false);
  }
})();
