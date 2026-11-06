import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { moduleOn } from '@/modules/module';
import { Commands } from '@/modules/chat/commands';
import { MAIN_FRAME_BUTTONS } from '../bottom_bar/mainFrameButtons';
import { REFORGE_MENU_WINDOW } from '../../windows/reforge_menu';
import { MobileButton } from './mobileButton';
import { TouchIcon, type TouchIconName } from './icons';

type Shortcut = { icon: TouchIconName; title: string; on: () => boolean; toggle: () => void };

const flip = (id: string) => MuWindows.setOpen(id, !MuWindows.isOpen(id));

/** The bar's cash shop button (the X-shop on Mu Reforge, the marketplace elsewhere). */
const SHOP = MAIN_FRAME_BUTTONS[0];

/**
 * The Menu button: the Mu Reforge menu where the world has it (our Android client's), else the
 * window menu - on a phone the one way to every window a key would open.
 */
const menuWindow = () => (moduleOn('reforge_hud') ? REFORGE_MENU_WINDOW : 'window_menu');

/**
 * Our Android client's top right row (`#warp`, `#character`, `#shop`, `#inventory`, `#menu`): round
 * shortcuts for the keys a phone lacks (M, C, X, I, N), left of the radar - plus the "D" command
 * window, whose entries a tap on a player then runs (pointerInputSystem).
 */
export const TopRow = observer(() => {
  const shortcuts: Shortcut[] = [
    { icon: 'warp', title: t('warp.title'), on: () => MuWindows.isOpen('move_command'), toggle: () => flip('move_command') },
    { icon: 'character', title: t('bottomBar.characterInfo'), on: () => MuWindows.isOpen('character_info'), toggle: () => flip('character_info') },
    { icon: 'shop', title: t(SHOP.titleKey), on: SHOP.pressed, toggle: SHOP.toggle },
    { icon: 'inventory', title: t('bottomBar.inventory'), on: () => MuWindows.isOpen('inventory'), toggle: () => flip('inventory') },
    { icon: 'command', title: t('keys.command'), on: () => Commands.windowOpen, toggle: () => Commands.toggleWindow() },
    { icon: 'menu', title: t('bottomBar.menu'), on: () => MuWindows.isOpen(menuWindow()), toggle: () => flip(menuWindow()) },
  ];
  return (
    <div className="touch-top-row">
      {shortcuts.map(s => (
        <MobileButton key={s.icon} className={`touch-btn touch-round touch-${s.icon}${s.on() ? ' on' : ''}`} title={s.title} onTap={s.toggle}>
          {() => <TouchIcon name={s.icon} />}
        </MobileButton>
      ))}
    </div>
  );
});
