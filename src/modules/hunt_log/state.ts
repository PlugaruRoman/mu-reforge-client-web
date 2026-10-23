import { observable, runInAction } from 'mobx';

/**
 * The "Instant Hunting Log" figures of the current hunting session, as our server computes them
 * (S GameLogic/Hunt/HuntLogInfoAction.cs) and sends them (C1 DA 01). The client only shows them:
 * every rate, projection and the reset check is the server's. Port of our client's
 * GameLogic/Reforge/ReforgeHuntLog.h and Network/Reforge/HuntLogPackets.cpp.
 */

/** A time-to-level the server cannot estimate: no experience yet, or already at the maximum level. */
export const NOT_ESTIMABLE = 0xffffffff;

export type HuntLogStatistics = {
  active: boolean;
  elapsedSeconds: number;
  damagePerMinute: number;
  zenPerMinute: number;
  lastZen: number;
  levelUps: number;
  /** Experience per minute without the player's own VIP bonus, and with the Experience VIP tier's. */
  experiencePerMinuteNoVip: number;
  experiencePerMinuteWithVip: number;
  averageExperiencePerMonster: number;
  lastExperience: number;
  /** NOT_ESTIMABLE, or 0 when that level is already reached. */
  secondsToNextLevel: number;
  nextLevel: number;
  secondsToMaxLevel: number;
  resetAvailable: boolean;
};

/** u64 as a number: past 2^53 a figure loses its last digits, which no hunting rate reaches. */
const u64 = (v: DataView, o: number) => Number(v.getBigUint64(o, true));

/**
 * 80 bytes: `[C1][50][DA][01][active][elapsed u32][damage/min u64][zen/min u64][last zen u64]
 * [level ups u32][exp/min u64][exp/min VIP u64][avg exp u64][last exp u64][to next u32][next level u16]
 * [to max u32][reset]`, little endian (S RemoteView/Hunt/HuntLogViewPlugIn.cs:52-68).
 */
export function parseHuntLog(view: DataView): HuntLogStatistics | null {
  if (view.byteLength < 80) return null;
  return {
    active: view.getUint8(4) !== 0,
    elapsedSeconds: view.getUint32(5, true),
    damagePerMinute: u64(view, 9),
    zenPerMinute: u64(view, 17),
    lastZen: u64(view, 25),
    levelUps: view.getUint32(33, true),
    experiencePerMinuteNoVip: u64(view, 37),
    experiencePerMinuteWithVip: u64(view, 45),
    averageExperiencePerMonster: u64(view, 53),
    lastExperience: u64(view, 61),
    secondsToNextLevel: view.getUint32(69, true),
    nextLevel: view.getUint16(73, true),
    secondsToMaxLevel: view.getUint32(75, true),
    resetAvailable: view.getUint8(79) !== 0,
  };
}

/** `[C1][04][DA][01]` (S MessageHandler/Hunt/HuntLogRequestHandlerPlugIn.cs). */
export function buildHuntLogRequest(): DataView {
  return new DataView(Uint8Array.from([0xc1, 0x04, 0xda, 0x01]).buffer);
}

export const HuntLog = observable(
  {
    statistics: null as HuntLogStatistics | null,
    /** Opened by hand (our client's N menu row): shows whether the MU Helper runs or not. */
    pinned: false,
    /** Closed during the current MU Helper run; cleared when the helper stops. */
    dismissed: false,
  },
  {},
  { deep: false }
);

/** `ShouldShow`: pinned, or the MU Helper runs and the log was not closed for this run. */
export const huntLogShown = (helperActive: boolean): boolean => HuntLog.pinned || (helperActive && !HuntLog.dismissed);

export function setHuntLog(statistics: HuntLogStatistics): void {
  runInAction(() => (HuntLog.statistics = statistics));
}

/** Its X: closed, and for the rest of this helper run. */
export function closeHuntLog(helperActive: boolean): void {
  runInAction(() => {
    HuntLog.pinned = false;
    HuntLog.dismissed = helperActive;
  });
}

/** The helper stopped: the next start brings the log back. */
export function helperStopped(): void {
  if (HuntLog.dismissed) runInAction(() => (HuntLog.dismissed = false));
}
