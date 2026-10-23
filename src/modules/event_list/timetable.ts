/**
 * The Event Timer window's timetable (H): a copy of the one our C++ client hard-codes
 * (UI/EventTimer/EventTimerEntries.cpp), with its rules (GameLogic/Reforge/ReforgeEventSchedule.cpp).
 * The server sends no schedule for most of these rows; for the four mini-games it does (C1 97,
 * `./state.ts`), the server's answer wins over the table, and an invasion's boss status (C2 CC 01,
 * `modules/invasions`) is laid over its row. Every time is minutes after 00:00 UTC; the server
 * schedules on UTC and starts a run at the first timetable entry strictly after now.
 *
 * The table mirrors the server's configuration as stored in its database, which an admin can change:
 * re-check it against our client's table whenever the schedule changes.
 */
import { applyInvasionStatus, type RunState, type ServerRowState } from '../invasions';
import { EventState, MiniGameType, eventListEntry, secondsSinceReport, secondsUntilStart } from './state';

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;
const END_OF_DAY = 24 * 60;
/** Daily, or the UTC weekday of a weekly event (0 = Sunday, as System.DayOfWeek). */
export const DAILY = -1;

export type Timetable = {
  dayOfWeek: number;
  /** Minutes between two runs; 0 means the explicit `times` list. */
  intervalMinutes: number;
  firstMinute: number;
  /** The end of the window (exclusive). */
  endMinute: number;
  /** How long one run lasts: the server's TaskDuration, or a mini-game's entrance window. */
  durationMinutes: number;
  times: readonly number[];
  /** A weekly event's further weekdays, as a mask (1 << weekday). */
  alsoDays: number;
};

export type TimerTab = 'events' | 'invasions';

export type TimerEntry = {
  /** The row's text id (the window names it). */
  id: string;
  /** Where it happens, a text id too. */
  where: string;
  tab: TimerTab;
  timetable: Timetable;
  /** The server's InvasionStatusIds number (C2 CC 01); 0 = none. */
  statusId: number;
  /** The mini-game the server's event list (C1 97) reports for this row; 0 = none. */
  miniGame: number;
};

const at = (hour: number, minute: number) => hour * 60 + minute;
const every = (interval: number, first: number, duration: number, end = END_OF_DAY): Timetable => ({
  dayOfWeek: DAILY, intervalMinutes: interval, firstMinute: first, endMinute: end, durationMinutes: duration, times: [], alsoDays: 0,
});
const dailyAt = (times: readonly number[], duration: number): Timetable => ({
  dayOfWeek: DAILY, intervalMinutes: 0, firstMinute: 0, endMinute: 0, durationMinutes: duration, times, alsoDays: 0,
});
const weekly = (day: number, times: readonly number[], duration: number, alsoDays = 0): Timetable => ({
  dayOfWeek: day, intervalMinutes: 0, firstMinute: 0, endMinute: 0, durationMinutes: duration, times, alsoDays,
});

const SUNDAY = 0;
const TUESDAY = 2;
const FRIDAY = 5;
const SATURDAY = 6;

/** TvT: 3 minutes of registration and the 10-minute battle (the Battle Master's window shows it too). */
export const TVT_TIMETABLE = dailyAt([at(2, 0), at(10, 0), at(18, 0), at(22, 0)], 13);

const row = (id: string, where: string, tab: TimerTab, timetable: Timetable, statusId = 0, miniGame = 0): TimerEntry =>
  ({ id, where, tab, timetable, statusId, miniGame });

/** EventTimerEntries.cpp `Table`, in its order (the order ties keep). */
export const TIMER_ENTRIES: readonly TimerEntry[] = [
  row('bloodCastle', 'bloodCastle18', 'events', every(120, at(0, 30), 5), 0, MiniGameType.BloodCastle),
  row('devilSquare', 'devilSquare17', 'events', every(240, at(0, 0), 1), 0, MiniGameType.DevilSquare),
  row('chaosCastle', 'chaosCastle17', 'events', every(60, at(0, 0), 5), 0, MiniGameType.ChaosCastle),
  row('illusionTemple', 'illusionTemple', 'events', every(120, at(1, 10), 5), 0, MiniGameType.IllusionTemple),
  row('happyHour', 'everywhere', 'events', every(360, at(0, 5), 60)),
  row('flowerEvent', 'towns', 'events', every(240, at(3, 10), 30), 23),
  row('kanturu', 'kanturuRuins', 'events', dailyAt([at(20, 0)], 3)),
  row('tvt', 'tvtArena', 'events', TVT_TIMETABLE),
  row('deepDungeon', 'deepDungeon15', 'events', dailyAt([at(8, 0), at(20, 0)], 30)),
  row('castleSiege', 'valleyOfLoren', 'events', weekly(SUNDAY, [at(15, 0)], 60)),
  row('olympiad', 'lorencia', 'events', weekly(SATURDAY, [at(16, 0)], 180)),
  row('fortSiege', 'fortSiegeWhere', 'events', weekly(TUESDAY, [at(16, 0)], 60, 1 << FRIDAY)),
  // The bosses come in waves, a few minutes apart by tier, so one party cannot take them all.
  row('icarusOverlord', 'icarus', 'invasions', every(240, at(0, 35), 60), 5),
  row('skeletonKing', 'dungeon', 'invasions', every(180, at(0, 37), 40), 1),
  row('anubis', 'tarkan', 'invasions', every(180, at(0, 39), 40), 4),
  row('redDragon', 'towns', 'invasions', every(360, at(1, 20), 30), 21),
  row('pharaoh', 'karutan', 'invasions', every(360, at(1, 33), 90), 10),
  row('harpyQueen', 'landOfTrials', 'invasions', every(240, at(1, 35), 60), 6),
  row('malgruth', 'lostTower', 'invasions', every(180, at(1, 37), 40), 2),
  row('goldenInvasion', 'townsAndFields', 'invasions', every(240, at(2, 0), 30), 20),
  row('roshan', 'aida', 'invasions', every(240, at(2, 35), 60), 7),
  row('lordOfDarkness', 'atlans', 'invasions', every(180, at(2, 37), 40), 3),
  row('demonBull', 'crywolf', 'invasions', every(360, at(3, 33), 90), 11),
  row('blueAlien', 'kanturuRuins', 'invasions', every(240, at(3, 35), 60), 8),
  row('karmaije', 'vulcanus', 'invasions', every(360, at(5, 33), 90), 9),
  row('whiteWizard', 'towns', 'invasions', every(120, at(12, 40), 30, at(23, 0)), 22),
  row('lordOfKundun', 'swampOfPeace', 'invasions', dailyAt([at(12, 31), at(19, 31)], 120), 13),
  row('centaurBosses', 'raklion', 'invasions', dailyAt([at(15, 31), at(21, 31)], 120), 12),
  row('selupan', 'raklionBossRoom', 'invasions', dailyAt([at(17, 31), at(23, 31)], 120), 14),
];

/** A moment on the UTC clock, as far as a timetable cares. */
export type UtcMoment = { secondOfDay: number; dayOfWeek: number };

export function utcMomentOf(epochMs: number): UtcMoment {
  const seconds = Math.floor(epochMs / 1000);
  // 1970-01-01 was a Thursday.
  return { secondOfDay: ((seconds % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY, dayOfWeek: (Math.floor(seconds / SECONDS_PER_DAY) + 4) % 7 };
}

/** `DailyOccurrences`: the server's `PeriodicTaskConfiguration.GenerateTimeSequence`. */
function dailyOccurrences(t: Timetable): number[] {
  if (t.times.length) return t.times.slice(0, 32);
  const out: number[] = [];
  if (t.intervalMinutes <= 0) return out;
  for (let m = t.firstMinute; m < t.endMinute && out.length < 32; m += t.intervalMinutes) out.push(m);
  return out;
}

/** `StateAt`: the soonest start strictly after now, and a run going on (the previous cycle's too). */
export function stateAt(t: Timetable, now: UtcMoment): RunState {
  const state: RunState = { running: false, secondsToStart: SECONDS_PER_DAY, secondsToEnd: 0 };
  const occurrences = dailyOccurrences(t);
  if (!occurrences.length) return state;
  const weekly = t.dayOfWeek !== DAILY;
  const cycle = weekly ? SECONDS_PER_WEEK : SECONDS_PER_DAY;
  const elapsed = weekly ? now.dayOfWeek * SECONDS_PER_DAY + now.secondOfDay : now.secondOfDay;
  const duration = t.durationMinutes * SECONDS_PER_MINUTE;
  const mask = weekly ? (1 << t.dayOfWeek) | t.alsoDays : 1;
  let soonest = -1;
  for (let day = 0; day < 7; day++) {
    if ((mask & (1 << day)) === 0) continue;
    const dayOffset = weekly ? day * SECONDS_PER_DAY : 0;
    for (const minute of occurrences) {
      const start = dayOffset + minute * SECONDS_PER_MINUTE;
      let delta = start - elapsed;
      if (delta <= 0) delta += cycle;
      if (soonest < 0 || delta < soonest) soonest = delta;
      for (const c of [0, 1]) {
        const begin = start - c * cycle;
        if (elapsed < begin || elapsed >= begin + duration) continue;
        const left = begin + duration - elapsed;
        if (!state.running || left < state.secondsToEnd) {
          state.running = true;
          state.secondsToEnd = left;
        }
      }
    }
  }
  if (soonest > 0) state.secondsToStart = soonest;
  return state;
}

export type TimerRowState = ServerRowState & {
  /** The server's event list (C1 97) answered for this row. */
  fromServer: boolean;
};

export const isLiveHere = (r: ServerRowState): boolean => r.run.running && !r.defeated && r.otherServer === 0;

const rankOf = (r: ServerRowState) => (r.defeated ? 1 : isLiveHere(r) ? 0 : 2);
const shownSeconds = (r: ServerRowState) => (r.otherServer !== 0 && r.run.running ? r.run.secondsToEnd : r.run.secondsToStart);

/** `IsMoreUrgent`: running rows first (ending soonest on top), then the beaten ones, then the upcoming by the time shown. */
export function compareUrgency(a: ServerRowState, b: ServerRowState): number {
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return a.run.secondsToEnd - b.run.secondsToEnd;
  return shownSeconds(a) - shownSeconds(b);
}

/**
 * Lays the server's event list over a mini-game row: open or running is live (until the table's
 * end, when it has one), a wait the server knows replaces the table's.
 */
function applyEventList(entry: TimerEntry, nowMs: number, run: RunState): { run: RunState; fromServer: boolean } {
  const reported = entry.miniGame ? eventListEntry(entry.miniGame) : undefined;
  if (!reported) return { run, fromServer: false };
  if (reported.state === EventState.Open || reported.state === EventState.Running) {
    return { run: { ...run, running: true, secondsToEnd: run.running ? run.secondsToEnd : 0 }, fromServer: true };
  }
  const seconds = secondsUntilStart(reported, secondsSinceReport(nowMs));
  if (seconds === null || seconds <= 0) return { run: { ...run, running: false, secondsToEnd: 0 }, fromServer: true };
  return { run: { running: false, secondsToStart: seconds, secondsToEnd: 0 }, fromServer: true };
}

/** One row's whole state at `nowMs` (epoch ms on the shared clock). */
export function timerRowState(entry: TimerEntry, nowMs: number): TimerRowState {
  const table = stateAt(entry.timetable, utcMomentOf(nowMs));
  const { run, fromServer } = applyEventList(entry, nowMs, table);
  const server = entry.statusId > 0
    ? applyInvasionStatus(entry.statusId, nowMs, run)
    : { run, defeated: false, alive: 0, total: 0, otherServer: 0 };
  return { ...server, fromServer };
}

export type TimerRow = { entry: TimerEntry; state: TimerRowState };

/** A tab's rows by urgency (ties keep the table's order), and whether each tab has a live row. */
export function timerRows(tab: TimerTab, nowMs: number): { rows: TimerRow[]; live: Record<TimerTab, boolean> } {
  const live: Record<TimerTab, boolean> = { events: false, invasions: false };
  const rows: TimerRow[] = [];
  for (const entry of TIMER_ENTRIES) {
    const state = timerRowState(entry, nowMs);
    live[entry.tab] ||= isLiveHere(state);
    if (entry.tab === tab) rows.push({ entry, state });
  }
  rows.sort((a, b) => compareUrgency(a.state, b.state));
  return { rows, live };
}

/** `Countdown`: `%02d:%02d:%02d`, or `%dd %02dh` from a day on. */
export function countdownText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  if (s >= SECONDS_PER_DAY) return `${Math.floor(s / SECONDS_PER_DAY)}d ${pad(Math.floor((s % SECONDS_PER_DAY) / SECONDS_PER_HOUR))}h`;
  return `${pad(Math.floor(s / SECONDS_PER_HOUR))}:${pad(Math.floor((s % SECONDS_PER_HOUR) / 60))}:${pad(s % 60)}`;
}
