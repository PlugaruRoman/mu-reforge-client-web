import { runInAction } from 'mobx';
import type { TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { resetCamera } from '@/controllers/camera';
import { GameOptions, setGameOption } from '@/controllers/settings';
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
 * Our client's Mu Reforge menu (UI/Reforge/ReforgeMenuEntries.cpp, N): one tile per Mu Reforge window
 * on the Windows tab, with the key that opens it, and the view and HUD switches on the View & HUD tab.
 * A tile shows only while its module is on. Of our client's View & HUD tiles only those Babylon can do
 * are here, each on Babylon's own setting (the rest - radar size, HUD buttons, player names, mobs HP,
 * zoom lock, camera shake, auto potion, PvP attack, Hunting Log size - have no web equivalent).
 */
export type MenuTab = 'windows' | 'settings';

export type MenuEntry = {
  id: string;
  labelKey: TextKey;
  /** The footer's line while the tile is hovered (`MainMenu*Desc`). */
  descKey: TextKey;
  /** The key our client prints on the tile's chip ('' for none). */
  key: string;
  /** The tile's icon: `newui_mainmenu_btn_<icon>.OZT` (a setting's `_off` art while it is off). */
  icon: string;
  /** `window` opens one; `setting` is on or off; `action` does something once. */
  kind: 'window' | 'setting' | 'action';
  /** The module the tile needs; none for a core one. */
  module?: string;
  /** The tile can be used now (Guest Access is the owner's). */
  available?: () => boolean;
  isOn: () => boolean;
  toggle: () => void;
};

/** The icons on the character window's plates rather than the menu's own art (reforge_main_menu.rcss). */
export const iconFile = (entry: MenuEntry): string => {
  if (entry.icon === 'reset' || entry.icon === 'addstats') return `newui_chainfo_btn_${entry.icon}.OZT`;
  const off = entry.kind === 'setting' && !entry.isOn() && HAS_OFF_ART.has(entry.icon);
  return `newui_mainmenu_btn_${entry.icon}${off ? '_off' : ''}.OZT`;
};
const HAS_OFF_ART = new Set(['radar', 'camera3d', 'party', 'requests', 'weather', 'autopot', 'pvp', 'mobshp', 'zoomlock', 'camerashake', 'playernames', 'hudbuttons']);

const windowTile = (id: string, labelKey: TextKey, descKey: TextKey, key: string, icon: string, module?: string): MenuEntry => ({
  id,
  labelKey,
  descKey,
  key,
  icon,
  kind: 'window',
  module,
  isOn: () => MuWindows.isOpen(id),
  toggle: () => runInAction(() => MuWindows.setOpen(id, !MuWindows.isOpen(id))),
});

const optionTile = (id: string, labelKey: TextKey, descKey: TextKey, icon: string, option: 'minimapCorner' | 'cameraControl' | 'weatherEffects' | 'muteInBackground'): MenuEntry => ({
  id,
  labelKey,
  descKey,
  key: '',
  icon,
  kind: 'setting',
  isOn: () => GameOptions[option],
  toggle: () => setGameOption(option, !GameOptions[option]),
});

/** `[Reforge] HuntLogX / HuntLogY` here: the hunting log's saved place (`hunt_log/index.tsx`). */
const HUNT_LOG_PLACEMENT = 'hunt_log_panel';
/** `partyInviteReply`: 2 accepts an invitation on its own. */
const AUTO_ACCEPT = 2;

export const MENU_ENTRIES: readonly MenuEntry[] = [
  windowTile(RESET_WINDOW, 'resetWin.title', 'reforgeMenu.desc.reset', '', 'reset', 'resets'),
  windowTile(ADD_STATS_WINDOW, 'resetWin.addStats', 'reforgeMenu.desc.addStats', '', 'addstats', 'resets'),
  windowTile(JEWEL_BANK_WINDOW, 'jewelBank.title', 'reforgeMenu.desc.jewelBank', 'J', 'jewelbank', 'jewel_bank'),
  windowTile(EVENT_TIMER_WINDOW, 'eventTimer.title', 'reforgeMenu.desc.eventTimer', 'H', 'eventtimer', 'event_list'),
  windowTile(VIP_WINDOW, 'vipShop.title', 'reforgeMenu.desc.vip', 'K', 'vipshop', 'vip'),
  windowTile(SOUL_WINDOW, 'soul.title', 'reforgeMenu.desc.soul', 'S', 'soulsystem', 'soul_points'),
  windowTile('party_search', 'partySearch.title', 'reforgeMenu.desc.partySearch', 'P', 'partysearch', 'party_search'),
  windowTile(DEATH_RECORDS_WINDOW, 'deathRecords.title', 'reforgeMenu.desc.deathRecords', 'Y', 'deathrecords', 'olympiad'),
  {
    ...windowTile(GUEST_ACCESS_WINDOW, 'reforgeHud.guest.title', 'reforgeMenu.desc.guestAccess', 'L', 'guestaccess', 'reforge_hud'),
    available: () => !ReforgeHud.isGuest,
  },
  windowTile(EVENT_LIST_WINDOW, 'eventList.title', 'reforgeMenu.desc.eventList', 'B', 'eventlist', 'event_list'),
  {
    id: 'hunt_log',
    labelKey: 'huntLog.title',
    descKey: 'reforgeMenu.desc.huntLog',
    key: '',
    icon: 'huntlog',
    kind: 'window',
    module: 'hunt_log',
    isOn: () => huntLogShown(MuHelper.active),
    toggle: () => toggleHuntLog(MuHelper.active),
  },
  {
    id: 'reforge_market',
    labelKey: 'marketBoard.title',
    descKey: 'reforgeMenu.desc.market',
    key: '',
    icon: 'market',
    kind: 'window',
    module: 'reforge_market',
    isOn: () => ReforgeMarket.isOpen,
    toggle: () => runInAction(() => (ReforgeMarket.isOpen ? ReforgeMarket.close() : ReforgeMarket.open())),
  },
  {
    ...windowTile(ITEM_COLLECTIONS_ID, 'itemCollections.title', 'reforgeMenu.desc.itemCollections', ';', 'itemcollection', 'item_collections'),
    toggle: () => toggleItemCollections(false),
  },
  windowTile('options', 'options.title', 'reforgeMenu.desc.options', 'O', 'options'),

  optionTile('radar', 'reforgeMenu.radar', 'reforgeMenu.desc.radar', 'radar', 'minimapCorner'),
  optionTile('camera3d', 'reforgeMenu.camera3d', 'reforgeMenu.desc.camera3d', 'camera3d', 'cameraControl'),
  {
    id: 'reset_view',
    labelKey: 'reforgeMenu.resetView',
    descKey: 'reforgeMenu.desc.resetView',
    key: '',
    icon: 'resetview',
    kind: 'action',
    isOn: () => false,
    toggle: () => resetCamera(),
  },
  {
    id: 'auto_party',
    labelKey: 'reforgeMenu.autoParty',
    descKey: 'reforgeMenu.desc.autoParty',
    key: '',
    icon: 'party',
    kind: 'setting',
    isOn: () => GameOptions.partyInviteReply === AUTO_ACCEPT,
    toggle: () => setGameOption('partyInviteReply', GameOptions.partyInviteReply === AUTO_ACCEPT ? 0 : AUTO_ACCEPT),
  },
  {
    id: 'requests',
    labelKey: 'reforgeMenu.requests',
    descKey: 'reforgeMenu.desc.requests',
    key: '',
    icon: 'requests',
    kind: 'setting',
    module: 'reforge_hud',
    isOn: () => ReforgeHud.requestsAllowed,
    toggle: () => runInAction(() => ReforgeHud.toggleRequests()),
  },
  optionTile('weather', 'reforgeMenu.weather', 'reforgeMenu.desc.weather', 'weather', 'weatherEffects'),
  {
    id: 'hunt_log_position',
    labelKey: 'reforgeMenu.huntLogPosition',
    descKey: 'reforgeMenu.desc.huntLogPosition',
    key: '',
    icon: 'huntlog',
    kind: 'action',
    module: 'hunt_log',
    isOn: () => false,
    toggle: () => MuWindows.reset(HUNT_LOG_PLACEMENT),
  },
  optionTile('mute_background', 'reforgeMenu.muteBackground', 'reforgeMenu.desc.muteBackground', 'options', 'muteInBackground'),
];

/** The tiles of a tab whose module is on. */
export const menuEntries = (tab?: MenuTab): MenuEntry[] =>
  MENU_ENTRIES.filter(e => (!e.module || moduleOn(e.module)) && (!tab || (tab === 'windows') === (e.kind === 'window')));

/** A click on a tile: nothing while it cannot be used. True when it acted. */
export function activateEntry(entry: MenuEntry): boolean {
  if (entry.available && !entry.available()) return false;
  entry.toggle();
  return true;
}
