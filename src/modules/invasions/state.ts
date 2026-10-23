import { observable, runInAction } from 'mobx';

/**
 * The boss status of the invasions as our server last reported it (C2 CC 01), for the Event Timer
 * window's Invasions tab. Our client's GameLogic/Reforge/ReforgeInvasionStatus.cpp, rule for rule.
 * Durations count from the moment the report arrived, so the client's own clock does not matter.
 */

/** S InvasionStatusIds: 1..19 raid bosses (beaten = slain), 20 and up town invasions (cleared). */
export const FIRST_TOWN_INVASION_ID = 20;
const MAX_STATUS_ID = 32;
/** `secondsSinceDefeat` while a counted monster still lives. */
export const NOT_DEFEATED = 0xffffffff;

/** 0 idle, 1 announced, 2 running, 3 runs on another game server of the realm only. */
export const InvasionPhase = { Idle: 0, Prepared: 1, Running: 2, OtherServer: 3 } as const;

export type InvasionStatus = {
  id: number;
  phase: number;
  alive: number;
  total: number;
  /** Until the run's window closes, at receipt; 0 unless running. */
  secondsToEnd: number;
  /** Since the last counted monster died, at receipt; NOT_DEFEATED while one lives. */
  secondsSinceDefeat: number;
  killer: string;
  /** The realm's server number it runs on (1 = the first), 0 = every one. */
  hostServer: number;
};

const ENTRY_SIZE = 31;
const KILLER_SIZE = 16;
const decoder = new TextDecoder();

/**
 * `[C2][len u16 BE][CC][01][count]`, then per entry `[id][phase][alive u16][total u16]
 * [secondsToEnd u32][secondsSinceDefeat u32][killer 16, UTF-8][hostServer]`, little endian
 * (S RemoteView/Invasions/InvasionStatusViewPlugIn.cs:62-97).
 */
export function parseInvasionStatus(view: DataView): InvasionStatus[] {
  if (view.byteLength < 6) return [];
  const count = Math.min(view.getUint8(5), Math.floor((view.byteLength - 6) / ENTRY_SIZE));
  const out: InvasionStatus[] = [];
  for (let i = 0; i < count; i++) {
    const o = 6 + i * ENTRY_SIZE;
    const killer = new Uint8Array(view.buffer, view.byteOffset + o + 14, KILLER_SIZE);
    const end = killer.indexOf(0);
    out.push({
      id: view.getUint8(o),
      phase: view.getUint8(o + 1),
      alive: view.getUint16(o + 2, true),
      total: view.getUint16(o + 4, true),
      secondsToEnd: view.getUint32(o + 6, true),
      secondsSinceDefeat: view.getUint32(o + 10, true),
      killer: decoder.decode(end < 0 ? killer : killer.subarray(0, end)),
      hostServer: view.getUint8(o + 14 + KILLER_SIZE),
    });
  }
  return out;
}

type Kept = InvasionStatus & { receivedAtMs: number };

export const Invasions = observable(
  {
    statuses: new Map<number, Kept>(),
    /** Bumped with every report, so a window re-reads. */
    version: 0,
  },
  {},
  { deep: false }
);

/** The list the server sends is complete: it replaces the last one (`Forget` then `Set`). */
export function setInvasionStatuses(entries: readonly InvasionStatus[], nowMs: number): void {
  const next = new Map<number, Kept>();
  for (const e of entries) {
    if (e.id > 0 && e.id < MAX_STATUS_ID) next.set(e.id, { ...e, receivedAtMs: nowMs });
  }
  runInAction(() => {
    Invasions.statuses = next;
    Invasions.version++;
  });
}

export function forgetInvasionStatuses(): void {
  setInvasionStatuses([], 0);
}

const ageSeconds = (s: Kept, nowMs: number) => Math.max(0, Math.floor((nowMs - s.receivedAtMs) / 1000));

/** The report of a run still open at `nowMs`, else null (`FindRunning`). */
export function findRunning(id: number, nowMs: number): Kept | null {
  const s = Invasions.statuses.get(id);
  if (!s || s.phase !== InvasionPhase.Running || s.total <= 0) return null;
  // A beaten run stays beaten until its window closes; past that the report describes nothing.
  return ageSeconds(s, nowMs) >= s.secondsToEnd ? null : s;
}

/** A timetable row's run state, as `ReforgeEventSchedule.h` `RunState`. */
export type RunState = { running: boolean; secondsToStart: number; secondsToEnd: number };

/** The server's part of a row: beaten, alive / total, or the other server it runs on. */
export type ServerRowState = { run: RunState; defeated: boolean; alive: number; total: number; otherServer: number };

/**
 * `ApplyTo`: fills the server's part of a row. A run the server reports outside the timetable
 * (started by a game master, caught up late) counts as running until the reported end.
 */
export function applyInvasionStatus(id: number, nowMs: number, run: RunState): ServerRowState {
  const row: ServerRowState = { run: { ...run }, defeated: false, alive: 0, total: 0, otherServer: 0 };
  const kept = Invasions.statuses.get(id);
  if (kept && kept.phase === InvasionPhase.OtherServer) {
    row.otherServer = kept.hostServer > 0 ? kept.hostServer : 1;
    return row;
  }
  const s = findRunning(id, nowMs);
  if (!s) return row;
  row.alive = s.alive;
  row.total = s.total;
  row.defeated = s.alive === 0;
  if (!row.run.running) {
    row.run.running = true;
    row.run.secondsToEnd = Math.max(0, s.secondsToEnd - ageSeconds(s, nowMs));
  }
  return row;
}

export const isTownInvasion = (id: number): boolean => id >= FIRST_TOWN_INVASION_ID;

/** Seconds since the last kill of a beaten run, counted on from the report. */
export function secondsSinceDefeat(s: Kept, nowMs: number): number {
  return s.secondsSinceDefeat === NOT_DEFEATED ? 0 : s.secondsSinceDefeat + ageSeconds(s, nowMs);
}
