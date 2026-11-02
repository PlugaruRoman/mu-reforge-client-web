import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { moduleOn } from '@/modules/module';
import { JEWEL_BANK_WINDOW } from '@/modules/jewel_bank';
import { VIP_WINDOW } from '@/modules/vip';
import { SidePlate } from '../_shared/sidePlates';
import { isMobileDevice } from '@/controllers/interface/mobile';
import {
  ITEM_COLLECTIONS_ID,
  toggleItemCollections,
} from '../item_collections';

type Shortcut = {
  module: string;
  window: string;
  file: string;
  title: TextKey;
  key: string;
  description: TextKey;
  toggle: () => void;
};

const toggle = (id: string) => () =>
  MuWindows.setOpen(id, !MuWindows.isOpen(id));

/**
 * Our client's shortcut column (UI/InventoryShortcuts/InventoryShortcutColumn.cpp,
 * themes/legacy/reforge_inventory_shortcuts.rcss): 36x29 plates off the inventory's left edge, top to
 * bottom the item collections, the VIP window and the jewel bank, 33 px apart with the last level with
 * the bottom row (391); the hint names the window, its key and what it does.
 */
const SHORTCUTS: readonly Shortcut[] = [
  {
    module: 'item_collections',
    window: ITEM_COLLECTIONS_ID,
    file: 'newui_mainmenu_btn_itemcollection.OZT',
    title: 'itemCollections.title',
    key: ';',
    description: 'inventory.plateCollectionsTip',
    toggle: () => toggleItemCollections(false),
  },
  {
    module: 'vip',
    window: VIP_WINDOW,
    file: 'newui_mainmenu_btn_vipshop.OZT',
    title: 'vipShop.title',
    key: 'K',
    description: 'inventory.plateVipTip',
    toggle: toggle(VIP_WINDOW),
  },
  {
    module: 'jewel_bank',
    window: JEWEL_BANK_WINDOW,
    file: 'newui_mainmenu_btn_jewelbank.OZT',
    title: 'jewelBank.title',
    key: 'J',
    description: 'inventory.plateJewelBankTip',
    toggle: toggle(JEWEL_BANK_WINDOW),
  },
];

const FIRST_TOP = 325;
const PITCH = 33;

/**
 * While another classic window is docked to the inventory's left (a vault, a shop, the trade) the
 * plates move out past it (SidePlate, `sidePlateLeft`) rather than standing down as our client's do
 * (`FollowInventory`): the jewel bank stays a click away at the vault. A plate stays pressed while
 * its window is open. A phone has none (our Android client hides the column): its windows are all
 * in the N menu.
 */
export const InventoryShortcuts = observer(() =>
  isMobileDevice() ? null : (
  <>
    {SHORTCUTS.map((s, i) =>
      moduleOn(s.module) ? (
        <SidePlate
          key={s.window}
          top={FIRST_TOP + i * PITCH}
          file={s.file}
          title={`${t(s.title)} (${s.key})`}
          description={t(s.description)}
          active={MuWindows.isOpen(s.window)}
          onClick={s.toggle}
        />
      ) : null
    )}
  </>
  )
);
