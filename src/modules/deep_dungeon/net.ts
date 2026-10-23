import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { serverNow } from '@/controllers/net/serverTime';
import { MuWindows } from '@/controllers/interface/windowManager';
import { Session } from '../session';
import { buildEnterRequest, forgetDeepDungeon, parseCountdown, parseFloorSelection, setCountdown, setSelection } from './state';

/** The floor selection window (`versions/shared/ui/windows/deep_dungeon`). */
export const DEEP_DUNGEON_WINDOW = 'deep_dungeon';

/** E3 02: descend to `floor` (1-based); the server checks the level, the time and the distance. */
export function enterDeepDungeon(floor: number): void {
  if (!Session.isOffline) Session.sendToGS(buildEnterRequest(floor));
  closeDeepDungeon();
}

export function closeDeepDungeon(): void {
  runInAction(() => MuWindows.setOpen(DEEP_DUNGEON_WINDOW, false));
}

/** Registers the listeners; the module's `install` calls it. */
export function installNet(): void {
  // The Dungeon Guide's answer while the event runs (S DeepDungeonEntryNpcPlugIn): the window opens.
  EventBus.on('DeepDungeonFloorSelection', view => {
    const selection = parseFloorSelection(view);
    if (!selection) return;
    setSelection(selection, serverNow());
    runInAction(() => MuWindows.setOpen(DEEP_DUNGEON_WINDOW, true));
  });
  // Every few seconds while the hero is inside; 0 seconds left: the event is over.
  EventBus.on('DeepDungeonCountdown', view => {
    const countdown = parseCountdown(view);
    if (countdown) setCountdown(countdown, serverNow());
  });
  // The server refuses an entry from afar: the window closes once the hero walks off.
  EventBus.on('heroWalked', () => {
    if (MuWindows.isOpen(DEEP_DUNGEON_WINDOW)) closeDeepDungeon();
  });
  EventBus.on('wsClosed', () => forgetDeepDungeon());
}
