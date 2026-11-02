import './style.less';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { t } from '@/i18n';
import { MuWindows, STAGE_SCALE_CAP } from '@/controllers/interface/windowManager';
import { useMuSprite } from '@/controllers/interface/components/mu_sprite';
import { bottomBarScreenHeight, worldCoveredFromRight } from '@/controllers/interface/components/mu_window';
import { useUiViewport } from '@/controllers/interface/components/ui_stage';
import { GameOptions, uiScaleFactor } from '@/controllers/settings';
import { playUiSound } from '@/controllers/sound/sfx';
import { REFORGE_MENU_WINDOW } from '../../windows/reforge_menu';
import { MENU_ENTRIES, activateEntry, type MenuEntry } from '../../windows/reforge_menu/entries';

/**
 * Our client's Menu (N) button (UI/Reforge/ReforgeMenuLauncher.cpp, reforge_menu_launcher.rcss) and the
 * HUD toggle column (UI/HudToggles/HudToggleBar.cpp, reforge_hud_toggles.rcss) at the right edge of the
 * world above the bottom bar: the column 30 in from the edge and 150 over the bar, the launcher 76 in
 * and 174 over it, right over the column. Sizes are stage units at our client's panel scale. Of the five
 * toggles only those with a web setting are here (Auto Party, Requests); Auto Potion, PvP Attack and
 * Player Names have none. Both hide while a classic window is docked on the right, which would cover
 * them (`IsWorldCoveredFromRight`); N still opens the menu.
 */

const LAUNCHER = { width: 68, height: 20, fromRight: 76, overBar: 174 } as const;
const COLUMN = { fromRight: 30, overBar: 150 } as const;
/** The toggles in our client's order (`Toggle::AutoParty`, `Toggle::Requests`), each a menu entry. */
const TOGGLES: readonly { id: string; glyph: string }[] = [
  { id: 'auto_party', glyph: 'party' },
  { id: 'requests', glyph: 'requests' },
];

const Sprite = observer(({ file, className }: { file: string; className: string }) => {
  const sprite = useMuSprite(file);
  return <div className={className} style={{ backgroundImage: sprite ? `url(${sprite.url})` : undefined }} />;
});

const Toggle = observer(({ entry, glyph }: { entry: MenuEntry; glyph: string }) => {
  const plate = useMuSprite('newui_skillbox.OZJ');
  const on = entry.isOn();
  return (
    <div
      className={`reforge-toggle${on ? ' on' : ''}`}
      title={`${t(entry.labelKey)}: ${t(entry.descKey)}`}
      style={{ backgroundImage: plate ? `url(${plate.url})` : undefined }}
      onClick={() => {
        playUiSound('click');
        activateEntry(entry);
      }}
    >
      {on && <Sprite file="newui_hudtoggle_frame.OZT" className="reforge-toggle-frame" />}
      <Sprite file={`newui_hudtoggle_${glyph}${on ? '' : '_off'}.OZT`} className="reforge-toggle-glyph" />
    </div>
  );
});

export const ReforgeLauncher = observer(() => {
  const viewport = useUiViewport();
  const button = useMuSprite('newui_btn_empty_small.OZT');
  const scale = Math.min(viewport.scale, STAGE_SCALE_CAP) * uiScaleFactor(GameOptions.uiScale);
  const workspaceBottom = viewport.height - bottomBarScreenHeight();
  const open = MuWindows.isOpen(REFORGE_MENU_WINDOW);
  if (worldCoveredFromRight()) return null;
  const toggles = TOGGLES.flatMap(({ id, glyph }) => {
    const entry = MENU_ENTRIES.find(e => e.id === id);
    return entry ? [{ entry, glyph }] : [];
  });
  const at = (fromRight: number, overBar: number) => ({
    left: viewport.width - fromRight * scale,
    top: workspaceBottom - overBar * scale,
    transform: `scale(${scale})`,
  });

  return (
    <>
      <div
        className={`reforge-launcher${open ? ' open' : ''}`}
        title={t('reforgeMenu.launcherHint')}
        style={{ ...at(LAUNCHER.fromRight, LAUNCHER.overBar), backgroundImage: button ? `url(${button.url})` : undefined }}
        onClick={() => {
          playUiSound('click');
          runInAction(() => MuWindows.setOpen(REFORGE_MENU_WINDOW, !open));
        }}
      >
        {t('reforgeMenu.launcher')}
      </div>
      <div className="reforge-toggles" style={at(COLUMN.fromRight, COLUMN.overBar)}>
        {toggles.map(({ entry, glyph }) => (
          <Toggle key={entry.id} entry={entry} glyph={glyph} />
        ))}
      </div>
    </>
  );
});
