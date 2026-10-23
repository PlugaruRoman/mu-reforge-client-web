import { runInAction } from 'mobx';
import { t } from '@/i18n';
import { EventBus } from '@/core/eventBus';
import { ENUM_WORLD } from '../../core/types';
import { addNotification } from '../chat';
import { lockDoppelgangerEntry } from '../events/doppelganger';
import {
  DoppelgangerEnterResultEnterResultEnum as Enter,
  DoppelgangerEnterResultPacket,
  DoppelgangerIceWalkerStateIceWalkerStateEnum as IceWalker,
  DoppelgangerIceWalkerStatePacket,
  DoppelgangerMonsterGoalPacket,
  DoppelgangerMonsterPositionPacket,
  DoppelgangerPlayInfoPacket,
  DoppelgangerResultPacket,
  DoppelgangerResultResultTypeEnum as Result,
  DoppelgangerStateUpdateDoppelgangerStateEnum as MatchState,
  DoppelgangerStateUpdatePacket,
  UpdateMiniGameStateMiniGameTypeStateEnum as MiniGame,
  UpdateMiniGameStatePacket,
} from '@versions/reforge/packets/ServerToClientPackets';
import { Doppelganger, type DoppelgangerNotice } from './state';

const ARENAS = new Set([
  ENUM_WORLD.WD_65DOPPLEGANGER1,
  ENUM_WORLD.WD_66DOPPLEGANGER2,
  ENUM_WORLD.WD_67DOPPLEGANGER3,
  ENUM_WORLD.WD_68DOPPLEGANGER4,
]);

const NOTICES: Partial<Record<number, DoppelgangerNotice>> = {
  [MiniGame.DoppelgangerEntranceClosing]: 'entranceClosing',
  [MiniGame.DoppelgangerStarting]: 'starting',
  [MiniGame.DoppelgangerIceWalkerCountdown]: 'iceWalker',
  [MiniGame.DoppelgangerEnding]: 'ending',
};

/** BF 0E-14 as our client reads them (WSclient.cpp `ReceiveEnterDoppelGangerEvent` .. `ReceiveDoppelGangerMonsterGoal`). */
export function installNet(): void {
  EventBus.on('DoppelgangerEnterResult', packet => {
    const result = new DoppelgangerEnterResultPacket(packet).Result;
    if (result === Enter.AlreadyStarted) addNotification(t('doppelganger.alreadyStarted'), 'error');
    if (result === Enter.PlayerKiller) addNotification(t('doppelganger.outlaw'), 'error');
    if (result !== Enter.Success) lockDoppelgangerEntry(result !== Enter.EntranceAvailable);
  });

  EventBus.on('DoppelgangerMonsterPosition', packet => {
    const step = new DoppelgangerMonsterPositionPacket(packet).Position;
    runInAction(() => Doppelganger.setMonsterPosition(step));
  });

  EventBus.on('DoppelgangerStateUpdate', packet => {
    if (new DoppelgangerStateUpdatePacket(packet).State === MatchState.Playing) runInAction(() => Doppelganger.start());
  });

  EventBus.on('DoppelgangerIceWalkerState', packet => {
    const p = new DoppelgangerIceWalkerStatePacket(packet);
    runInAction(() => Doppelganger.setIceWalker(p.State === IceWalker.Appeared, p.Position));
  });

  EventBus.on('DoppelgangerPlayInfo', packet => {
    const p = new DoppelgangerPlayInfoPacket(packet);
    const members = p.getPlayerPositions().map(m => ({ id: m.PlayerId, step: m.Position }));
    runInAction(() => Doppelganger.setParty(p.RemainingSeconds, members));
  });

  EventBus.on('DoppelgangerResult', packet => {
    const result = new DoppelgangerResultPacket(packet).Result;
    const kind = result === Result.Success ? 'success' : result === Result.Failed ? 'failed' : 'escaped';
    runInAction(() => Doppelganger.finish(kind));
  });

  EventBus.on('DoppelgangerMonsterGoal', packet => {
    const p = new DoppelgangerMonsterGoalPacket(packet);
    runInAction(() => Doppelganger.setGoal(p.MaximumGoalCount, p.GoalCount));
  });

  // Our client ignores 16-19 (`CDoppelGangerMatch::SetMatchGameCommand` is empty); the frame shows them as a line.
  EventBus.on('UpdateMiniGameState', packet => {
    const notice = NOTICES[new UpdateMiniGameStatePacket(packet).State];
    if (notice) runInAction(() => Doppelganger.setNotice(notice));
  });

  EventBus.on('warpCompleted', ({ map }) => {
    if (!ARENAS.has(map)) runInAction(() => Doppelganger.reset());
  });
  EventBus.on('wsClosed', () => runInAction(() => Doppelganger.reset()));
}
