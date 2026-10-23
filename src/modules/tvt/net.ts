import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { serverNow } from '@/controllers/net/serverTime';
import { MuWindows } from '@/controllers/interface/windowManager';
import { Merchant, registerNpcClick } from '../npc_shop';
import { BATTLE_MASTER_NPC, Tvt, forgetTvt, parseTvtRegistration, parseTvtScore, setTvtMatch, setTvtRegistration } from './state';

/** The Battle Master's window (`versions/shared/ui/windows/tvt`). */
export const TVT_WINDOW = 'tvt';

/**
 * Join: a talk to the Battle Master, whom the server's TvtJoinNpcPlugin registers or tells why not
 * (our client's UI/Tvt/TvtWindow.cpp `Join`). Only while the server says the registration is open.
 */
export function joinTvt(): void {
  const npc = Tvt.battleMaster;
  if (!npc || !Tvt.registrationOpen) return;
  Merchant.talkToNpc(npc);
  closeTvtWindow();
}

export function closeTvtWindow(): void {
  runInAction(() => {
    Tvt.battleMaster = null;
    MuWindows.setOpen(TVT_WINDOW, false);
  });
}

/** Registers the listeners; the module's `install` calls it. */
export function installNet(): void {
  EventBus.on('TvtScore', view => {
    const match = parseTvtScore(view);
    if (match) setTvtMatch(match, serverNow());
  });
  EventBus.on('TvtRegistration', view => setTvtRegistration(parseTvtRegistration(view)));
  EventBus.on('wsClosed', () => forgetTvt());
  // The window closes once the hero walks off, as the other NPC windows do.
  EventBus.on('heroWalked', () => {
    if (Tvt.battleMaster) closeTvtWindow();
  });
  // A click on the Battle Master opens the client's own window, no talk (our client's
  // UI/Reforge/ReforgeNpcTalk.cpp OwnWindowNpcs); Join talks to him.
  registerNpcClick(BATTLE_MASTER_NPC, npc => {
    runInAction(() => {
      Tvt.battleMaster = npc;
      MuWindows.setOpen(TVT_WINDOW, true);
    });
    return true;
  });
}
