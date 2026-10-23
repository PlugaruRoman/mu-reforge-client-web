import { EventBus } from '@/core/eventBus';
import { Session } from '../session';
import { buildHuntLogRequest, parseHuntLog, setHuntLog } from './state';

/** DA 01: the log asks once a second while it shows, as the old client did; the server answers each. */
export function requestHuntLog(): void {
  if (!Session.isOffline) Session.sendToGS(buildHuntLogRequest());
}

/** Registers the listener; the module's `install` calls it. */
export function installNet(): void {
  EventBus.on('HuntLogInfo', view => {
    const statistics = parseHuntLog(view);
    if (statistics) setHuntLog(statistics);
  });
}
