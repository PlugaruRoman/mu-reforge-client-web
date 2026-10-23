import { EventBus } from '@/core/eventBus';
import { serverNow } from '@/controllers/net/serverTime';
import { MiniGameEventCountRequestPacket } from '@versions/reforge/packets/ClientToServerPackets';
import { Session } from '../session';
import { takeServerSchedule } from '../events';
import type { EventScheduleKey } from '../events/schedule';
import { EventState, MiniGameType, forgetEventList, parseEventList, setEventList, type EventListEntry } from './state';

/** The type the request names; the server answers with every event whatever it is (EventListPackets.cpp). */
const REQUESTED_TYPE = MiniGameType.BloodCastle;

/** C1 9F `MiniGameEventCountRequest`, 4 bytes: S MiniGameEventCountRequestHandlerPlugIn answers with C1 97. */
export function buildEventListRequest(): DataView {
  const p = MiniGameEventCountRequestPacket.createPacket();
  p.MiniGame = REQUESTED_TYPE;
  return p.buffer;
}

export function requestEventList(): void {
  if (Session.isOffline) return;
  Session.sendToGS(buildEventListRequest());
}

const SCHEDULE_KEY: Partial<Record<number, EventScheduleKey>> = {
  [MiniGameType.BloodCastle]: 'bloodCastle',
  [MiniGameType.DevilSquare]: 'devilSquare',
  [MiniGameType.ChaosCastle]: 'chaosCastle',
};

/** The HUD's schedule rows (`events/schedule.ts`) take the server's list instead of polling for it. */
function feedSchedule(entries: readonly EventListEntry[]): void {
  for (const e of entries) {
    const key = SCHEDULE_KEY[e.type];
    if (!key) continue;
    const open = e.state === EventState.Open;
    const waiting = e.state === EventState.Closed && e.secondsUntilStart !== 0xffffffff;
    takeServerSchedule(key, open, waiting ? e.secondsUntilStart : null);
  }
}

/** Registers the listeners; the module's `install` calls it. */
export function installNet(): void {
  // Pushed on entering the world, after each entry attempt, and the answer to C1 9F
  // (S SendEventEntriesWhenEnteredWorldPlugIn, EnterMiniGameAction).
  EventBus.on('EventList', view => {
    const entries = parseEventList(view);
    setEventList(entries, serverNow());
    feedSchedule(entries);
  });
  EventBus.on('wsClosed', () => forgetEventList());
}
