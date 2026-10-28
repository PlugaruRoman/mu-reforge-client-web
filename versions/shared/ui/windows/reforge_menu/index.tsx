import './style.less';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { ModuleWindowFrame } from '@/controllers/interface/components/module_window';
import { AccountBody, AccountButton } from '../_shared/accountWidgets';
import { activateEntry, menuEntries, type MenuEntry } from './entries';

/** The Mu Reforge menu's window id. */
export const REFORGE_MENU_WINDOW = 'reforge_menu';
/** Our client's key (UI/Reforge/ReforgeHotkeys.cpp `MenuKey`); Mu Reforge moves `targetNearest` off it. */
const HOT_KEY = 'KeyN';

const label = (entry: MenuEntry) => (entry.key ? `${t(entry.labelKey)} (${entry.key})` : t(entry.labelKey));

const Row = observer(({ entry }: { entry: MenuEntry }) => (
  <AccountButton
    className="reforge-menu-row"
    label={label(entry)}
    active={entry.isOn()}
    disabled={entry.available ? !entry.available() : false}
    onClick={() => activateEntry(entry)}
  />
));

/**
 * Our client's Mu Reforge menu (UI/Reforge/ReforgeMenu.cpp, reforge_main_menu.rml): its windows and
 * its server-side switches as buttons, a pressed one open or on. It opens with N, the window menu's
 * Mu Reforge row, and the mobile menu button (through the window menu): the way in to every Mu Reforge
 * window for a player without a keyboard.
 */
export const ReforgeMenuWindow = observer(() => {
  const open = MuWindows.isOpen(REFORGE_MENU_WINDOW);
  const entries = open ? menuEntries() : [];
  const windows = entries.filter(e => !e.setting);
  const settings = entries.filter(e => e.setting);
  return (
    <ModuleWindowFrame id={REFORGE_MENU_WINDOW} title={t('reforgeMenu.title')} hotKey={HOT_KEY}>
      <AccountBody className="reforge-menu-body">
        {windows.map(entry => (
          <Row key={entry.id} entry={entry} />
        ))}
        {settings.length > 0 && <div className="acct-heading">{t('reforgeMenu.settings')}</div>}
        {settings.map(entry => (
          <Row key={entry.id} entry={entry} />
        ))}
      </AccountBody>
    </ModuleWindowFrame>
  );
});
