import './style.less';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { playUiSound } from '@/controllers/sound/sfx';
import { ReforgeShell, RfFooter, RfList, RfTabs } from '../_shared/reforgeShell';
import { activateEntry, iconFile, menuEntries, type MenuEntry, type MenuTab } from './entries';

/** The Mu Reforge menu's window id. */
export const REFORGE_MENU_WINDOW = 'reforge_menu';
/** Our client's key (UI/Reforge/ReforgeHotkeys.cpp `MenuKey`); Mu Reforge moves `targetNearest` off it. */
const HOT_KEY = 'KeyN';

/** The line under a tile's name: a setting's state, or Open while a window shows. */
function stateText(entry: MenuEntry): string {
  if (entry.kind === 'setting') return t(entry.isOn() ? 'reforgeMenu.stateOn' : 'reforgeMenu.stateOff');
  return entry.kind === 'window' && entry.isOn() ? t('reforgeMenu.stateOpen') : '';
}

const Tile = observer(({ entry, onHover }: { entry: MenuEntry; onHover: (entry: MenuEntry | null) => void }) => {
  const disabled = entry.available ? !entry.available() : false;
  const on = entry.isOn();
  const state = stateText(entry);
  const classes = ['rm-tile', entry.kind === 'window' && on ? 'open' : '', entry.kind === 'setting' ? 'setting' : '', on ? 'on' : '', disabled ? 'disabled' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={classes}
      onPointerEnter={() => onHover(entry)}
      onClick={() => {
        if (disabled) {
          playUiSound('error');
          return;
        }
        playUiSound('click');
        activateEntry(entry);
      }}
    >
      {/* The plate's pressed frame while its window is open (rm-icon-*-down). */}
      <MuSpriteFrame file={iconFile(entry)} y={entry.kind === 'window' && on ? 29 : 0} width={36} height={29} className="rm-icon" />
      <div className="rm-text">
        <div className="rm-label">
          {t(entry.labelKey)}
          {entry.key && <span className="rm-key">{entry.key}</span>}
        </div>
        {state && <div className="rm-state">{state}</div>}
      </div>
    </div>
  );
});

/**
 * Our client's Mu Reforge menu (UI/Reforge/ReforgeMenu.cpp, reforge_main_menu.rml), 340 x 398: every Mu
 * Reforge window and view switch as a tile in two tabs, Windows and View & HUD, two columns in a 256
 * high list; the footer explains the hovered tile. It opens with N, the HUD's Menu button, the window
 * menu's Mu Reforge row and the mobile menu button (through the window menu): the way in to every Mu
 * Reforge window for a player without a keyboard.
 */
export const ReforgeMenuWindow = observer(() => {
  const [tab, setTab] = useState<MenuTab>('windows');
  const [hovered, setHovered] = useState<MenuEntry | null>(null);
  const entries = menuEntries(tab);
  const hoveredDisabled = hovered?.available ? !hovered.available() : false;
  return (
    <ReforgeShell id={REFORGE_MENU_WINDOW} title={t('reforgeMenu.title')} hotKey={HOT_KEY} width={340} height={398} className="reforge-menu">
      <RfTabs
        tabs={[
          { id: 'windows' as const, label: t('reforgeMenu.tabWindows') },
          { id: 'settings' as const, label: t('reforgeMenu.tabSettings') },
        ]}
        active={tab}
        onSelect={id => {
          setTab(id);
          setHovered(null);
        }}
      />
      <RfList height={256} className="rm-grid">
        <div className="rm-tiles" onPointerLeave={() => setHovered(null)}>
          {entries.map(entry => (
            <Tile key={entry.id} entry={entry} onHover={setHovered} />
          ))}
        </div>
      </RfList>
      <RfFooter className={`rm-footer${hoveredDisabled ? ' unavailable' : ''}`}>
        {hovered ? (hoveredDisabled ? t('reforgeMenu.notAvailable') : t(hovered.descKey)) : t('reforgeMenu.footerIdle')}
      </RfFooter>
    </ReforgeShell>
  );
});
