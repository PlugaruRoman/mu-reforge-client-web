import { makeAutoObservable } from 'mobx';

/** The path the monsters walk is 22 steps long (`DoppelgangerUpdates.cpp`: `positionIndex / 22`). */
export const PATH_STEPS = 22;
/** `OpenningProcess`: the clock starts at ten minutes until the server says otherwise. */
const START_SECONDS = 600;
/** `Approach`: the gauges move this much of the path a frame (60 fps) toward the received position. */
const APPROACH_PER_SECOND = 0.6;

export type DoppelgangerResult = 'success' | 'failed' | 'escaped';
/** The 30-second lines our server sends on 0x92 (16-19, `UpdateMiniGameState`). */
export type DoppelgangerNotice = 'entranceClosing' | 'starting' | 'iceWalker' | 'ending';

/** Moves `value` toward `target` by at most `step`. */
export function approach(value: number, target: number, step: number): number {
  if (value + step <= target) return value + step;
  if (value - step >= target) return value - step;
  return target;
}

/**
 * The Doppelganger frame (`CDoppelGangerFrame`, UI/Events/DoppelGangerFrame.cpp): the monsters that
 * got through, the clock, the monsters' progress and the party on the path. The server's packets
 * set the targets; `update` moves the drawn gauges toward them as the original's `Render` did.
 */
export const Doppelganger = new (class _Doppelganger {
  /** `INTERFACE_DOPPELGANGER_FRAME` shown (state Playing). */
  frameOpen = false;
  enteredMonsters = 0;
  maxMonsters = 0;
  monsterTarget = 0;
  monsterGauge = 0;
  iceWalker = false;
  iceWalkerTarget = 0;
  iceWalkerPosition = 0;
  /** Party members by object id: the received and the drawn position (0..1). */
  party = new Map<number, { target: number; drawn: number }>();
  remainSeconds = START_SECONDS;
  /** `performance.now()` of `remainSeconds`. */
  remainAt = 0;
  timerStopped = false;
  /** The box over the frame: the failure conditions when the match starts, then the result. */
  box: 'rules' | DoppelgangerResult | null = null;
  notice: DoppelgangerNotice | null = null;
  noticeAt = 0;

  constructor() {
    makeAutoObservable(this);
  }

  /** `ShowMatchFrame` + `OpenningProcess`. */
  start(): void {
    this.enteredMonsters = 0;
    this.maxMonsters = 0;
    this.monsterTarget = 0;
    this.monsterGauge = 0;
    this.iceWalker = false;
    this.iceWalkerTarget = 0;
    this.iceWalkerPosition = 0;
    this.party = new Map();
    this.setRemain(START_SECONDS);
    this.timerStopped = false;
    this.frameOpen = true;
    this.box = 'rules';
  }

  setRemain(seconds: number): void {
    this.remainSeconds = seconds;
    this.remainAt = performance.now();
  }

  setMonsterPosition(step: number): void {
    this.monsterTarget = step / PATH_STEPS;
  }

  /** `SetIceWalkerMap`: a fresh Ice Walker appears where it is; one already shown walks there. */
  setIceWalker(present: boolean, step: number): void {
    if (!present) {
      this.iceWalker = false;
      this.iceWalkerTarget = 0;
      return;
    }
    this.iceWalkerTarget = (PATH_STEPS - step) / PATH_STEPS;
    if (!this.iceWalker) this.iceWalkerPosition = this.iceWalkerTarget;
    this.iceWalker = true;
  }

  /** `SetPartyMemberRcvd` + `SetPartyMemberInfo`: a member left out is no longer drawn. */
  setParty(seconds: number, members: readonly { id: number; step: number }[]): void {
    this.setRemain(seconds);
    const next = new Map<number, { target: number; drawn: number }>();
    for (const m of members) {
      next.set(m.id, { target: (PATH_STEPS - m.step) / PATH_STEPS, drawn: this.party.get(m.id)?.drawn ?? 0 });
    }
    this.party = next;
  }

  setGoal(maximum: number, entered: number): void {
    this.maxMonsters = maximum;
    this.enteredMonsters = entered;
  }

  /** `FinishMatch`: the clock stops (at 0 on a success) and the result box shows. */
  finish(result: DoppelgangerResult): void {
    this.timerStopped = true;
    if (result === 'success') this.setRemain(0);
    this.box = result;
  }

  setNotice(notice: DoppelgangerNotice): void {
    this.notice = notice;
    this.noticeAt = performance.now();
  }

  closeBox(): void {
    this.box = null;
  }

  /** The seconds the clock shows now. */
  secondsLeft(now: number): number {
    if (this.timerStopped) return this.remainSeconds;
    return Math.max(0, this.remainSeconds - Math.floor((now - this.remainAt) / 1000));
  }

  /** One frame of the gauges' approach. */
  update(dt: number): void {
    const step = APPROACH_PER_SECOND * dt;
    this.monsterGauge = approach(this.monsterGauge, this.monsterTarget, step);
    if (this.iceWalker) this.iceWalkerPosition = approach(this.iceWalkerPosition, this.iceWalkerTarget, step);
    for (const p of this.party.values()) p.drawn = approach(p.drawn, p.target, step);
  }

  /** Leaving the arena or the game closes it. */
  reset(): void {
    this.frameOpen = false;
    this.box = null;
    this.notice = null;
    this.party = new Map();
  }
})();
