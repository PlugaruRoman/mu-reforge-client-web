import { EventBus } from '@/core/eventBus';
import { serverNow } from '@/controllers/net/serverTime';
import { Session } from '../session';
import { forgetInvasionStatuses, parseInvasionStatus, setInvasionStatuses } from './state';

/**
 * C1 CC 01, four bytes: the request the Event Timer window sends every five seconds while it is open
 * (S MessageHandler/Invasions/InvasionStatusRequestHandlerPlugIn.cs, "[C1][len=4][CC][01]"; the
 * server answers at most once a second). Our client: Network/Reforge/InvasionStatusPackets.cpp.
 */
export function buildInvasionStatusRequest(): DataView {
  return new DataView(Uint8Array.from([0xc1, 0x04, 0xcc, 0x01]).buffer);
}

export function requestInvasionStatus(): void {
  if (Session.isOffline) return;
  Session.sendToGS(buildInvasionStatusRequest());
}

/** Registers the listeners; the module's `install` calls it. */
export function installNet(): void {
  // The answer to the request, and the push to every player when a run is beaten
  // (S BaseInvasionPlugIn.OnRunDefeated).
  EventBus.on('InvasionStatus', view => setInvasionStatuses(parseInvasionStatus(view), serverNow()));
  // Another game server's report must not survive a reconnect.
  EventBus.on('wsClosed', () => forgetInvasionStatuses());
}
