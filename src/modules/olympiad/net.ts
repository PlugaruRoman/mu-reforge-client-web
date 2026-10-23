import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { registerNpcClick } from '../npc_shop';
import { readDeathRecords, readOlympiadBoard } from './board';
import { Olympiad, STATUE_NUMBER } from './state';

/** The board (EE 01), the Death Records (E0 01) and the Battle Statue's click (`ReforgeNpcTalk.cpp`). */
export function installNet(): void {
  EventBus.on('OlympiadBoard', packet => {
    const board = readOlympiadBoard(packet);
    if (board) runInAction(() => Olympiad.setBoard(board));
  });

  EventBus.on('DeathRecords', packet => {
    const records = readDeathRecords(packet);
    runInAction(() => Olympiad.setDeathRecords(records));
  });

  // The statue opens its window without a talk; Join Match sends the talk.
  registerNpcClick(STATUE_NUMBER, npc => {
    Olympiad.openAt(npc.netId);
    return true;
  });

  EventBus.on('wsClosed', () => runInAction(() => Olympiad.reset()));
}
