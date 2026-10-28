import { runInAction } from 'mobx';
import type { TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { moduleOn } from '@/modules/module';
import { ADD_STATS_WINDOW, RESET_WINDOW } from '@/modules/resets';
import { JEWEL_BANK_WINDOW } from '@/modules/jewel_bank';
import { VIP_WINDOW } from '@/modules/vip';
import { SOUL_WINDOW } from '@/modules/soul_points';
import { DEATH_RECORDS_WINDOW } from '@/modules/olympiad';
import { GUEST_ACCESS_WINDOW, ReforgeHud } from '@/modules/reforge_hud';
import { huntLogShown, toggleHuntLog } from '@/modules/hunt_log';
import { MuHelper } from '@/modules/mu_helper';
import { ReforgeMarket } from '@/modules/reforge_market';
import { EVENT_TIMER_WINDOW } from '../event_timer';
import { EVENT_LIST_WINDOW } from '../event_list';
import { ITEM_COLLECTIONS_ID, toggleItemCollections } from '../item_collections';

/**
 * Our client's Mu Reforge menu (UI/Reforge/ReforgeMenuEntries.cpp, N): one row per Mu Reforge window,
 * with the key that opens it, and the server-side switches of its Settings tab. A row shows only while
 * its module is on. Party Search has no window here yet; the client-side switches (radar, camera,
 * names...) are Babylon's own Options.
 */
export type MenuEntry = {
  id: string;
  labelKey: TextKey;
  /** The key our client prints beside the row ('' for none). */
  key: string;
  /** The module the row needs; none for a core window. */
  module?: string;
  /** A switch (Settings tab), not a window. */
  setting?: boolean;
  /** The row can be used now (Guest Access is the owner's). */
  available?: () => boolean;
  isOn: () => boolean;
  toggle: () => void;
};

const windowRow = (id: string, labelKey: TextKey, key: string, module?: string): MenuEntry => ({
  id,
  labelKey,
  key,
  module,
  isOn: () => MuWindows.isOpen(id),
  toggle: () => runInAction(() => MuWindows.setOpen(id, !MuWindows.isOpen(id))),
});

export const MENU_ENTRIES: readonly MenuEntry[] = [
  windowRow(RESET_WINDOW, 'resetWin.title', '', 'resets'),
  windowRow(ADD_STATS_WINDOW, 'resetWin.addStats', '', 'resets'),
  windowRow(JEWEL_BANK_WINDOW, 'jewelBank.title', 'J', 'jewel_bank'),
  windowRow(EVENT_TIMER_WINDOW, 'eventTimer.title', 'H', 'event_list'),
  windowRow(VIP_WINDOW, 'vipShop.title', 'K', 'vip'),
  windowRow(SOUL_WINDOW, 'soul.title', 'S', 'soul_points'),
  windowRow(DEATH_RECORDS_WINDOW, 'deathRecords.title', 'Y', 'olympiad'),
  { ...windowRow(GUEST_ACCESS_WINDOW, 'reforgeHud.guest.title', 'L', 'reforge_hud'), available: () => !ReforgeHud.isGuest },
  windowRow(EVENT_LIST_WINDOW, 'eventList.title', 'B', 'event_list'),
  {
    id: 'hunt_log',
    labelKey: 'huntLog.title',
    key: '',
    module: 'hunt_log',
    isOn: () => huntLogShown(MuHelper.active),
    toggle: () => toggleHuntLog(MuHelper.active),
  },
  {
    id: 'reforge_market',
    labelKey: 'marketBoard.title',
    key: '',
    module: 'reforge_market',
    isOn: () => ReforgeMarket.isOpen,
    toggle: () => runInAction(() => (ReforgeMarket.isOpen ? ReforgeMarket.close() : ReforgeMarket.open())),
  },
  { ...windowRow(ITEM_COLLECTIONS_ID, 'itemCollections.title', ';', 'item_collections'), toggle: () => toggleItemCollections(false) },
  windowRow('options', 'options.title', 'O'),
  {
    id: 'requests',
    labelKey: 'reforgeMenu.requests',
    key: '',
    module: 'reforge_hud',
    setting: true,
    isOn: () => ReforgeHud.requestsAllowed,
    toggle: () => runInAction(() => ReforgeHud.toggleRequests()),
  },
];

/** The rows of the modules that are on. */
export const menuEntries = (): MenuEntry[] => MENU_ENTRIES.filter(e => !e.module || moduleOn(e.module));

/** A click on a row: nothing while it cannot be used. True when it acted. */
export function activateEntry(entry: MenuEntry): boolean {
  if (entry.available && !entry.available()) return false;
  entry.toggle();
  return true;
}
