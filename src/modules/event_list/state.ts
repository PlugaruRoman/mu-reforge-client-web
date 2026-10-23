import { observable, runInAction } from 'mobx';

/**
 * The mini-game events as our server last reported them (C1 97, `EventList`): whether each one is
 * open, running or waiting, how long until its next start, how many players are inside and how many
 * of today's entries the character has left. Port of our client's GameLogic/Reforge/ReforgeEventList.cpp;
 * every value is the server's `MiniGameDailyEntryStatusProvider`, this only keeps and orders it.
 */

/** S Network/Packets/CommonEnums.xml `MiniGameType`. */
export const MiniGameType = {
  Undefined: 0,
  DevilSquare: 1,
  BloodCastle: 2,
  CursedTemple: 3,
  ChaosCastle: 4,
  IllusionTemple: 5,
  Doppelganger: 6,
} as const;

/** S GameLogic/MiniGames/MiniGameDailyEntryStatus.cs `MiniGameEventState`. */
export const EventState = { Closed: 0, Open: 1, Running: 2, Ended: 3 } as const;

/** `MiniGameDailyEntryStatus.UnknownSeconds`: no schedule, or the next start is unknown. */
export const UNKNOWN_SECONDS = 0xffffffff;

export type EventListEntry = {
  type: number;
  state: number;
  /** At receipt; 0 while open. */
  secondsUntilStart: number;
  currentPlayers: number;
  maxPlayers: number;
  usedEntries: number;
  /** 0 = unlimited. */
  entryLimit: number;
};

const ENTRY_SIZE = 10;

/**
 * `[C1][len][97][count]` then 10-byte entries `[type][state][secondsUntilStart u32 LE][current]
 * [max][used][limit]` (S RemoteView/MiniGames/EventListViewPlugIn.cs; the generated `EventListPacket`
 * reads the same, `getEvents`). The count is kept inside the frame's length.
 */
export function parseEventList(view: DataView): EventListEntry[] {
  if (view.byteLength < 4) return [];
  const count = Math.min(view.getUint8(3), Math.floor((view.byteLength - 4) / ENTRY_SIZE));
  const out: EventListEntry[] = [];
  for (let i = 0; i < count; i++) {
    const o = 4 + i * ENTRY_SIZE;
    out.push({
      type: view.getUint8(o),
      state: view.getUint8(o + 1),
      secondsUntilStart: view.getUint32(o + 2, true),
      currentPlayers: view.getUint8(o + 6),
      maxPlayers: view.getUint8(o + 7),
      usedEntries: view.getUint8(o + 8),
      entryLimit: view.getUint8(o + 9),
    });
  }
  return out;
}

const group = (state: number) => (state === EventState.Open ? 0 : state === EventState.Running ? 1 : state === EventState.Ended ? 3 : 2);

/**
 * `OrderForDisplay`: open, then running, then the waiting ones by the soonest start (an unknown
 * start last, it is the largest value), then the ended ones. Ties keep the server's order.
 */
export function orderForDisplay(entries: readonly EventListEntry[]): EventListEntry[] {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => group(a.e.state) - group(b.e.state) || a.e.secondsUntilStart - b.e.secondsUntilStart || a.i - b.i)
    .map(x => x.e);
}

/** Seconds until the next start, counted down by the seconds since the report; null when unknown. */
export function secondsUntilStart(entry: EventListEntry, secondsSinceReport: number): number | null {
  if (entry.secondsUntilStart === UNKNOWN_SECONDS) return null;
  return Math.max(0, entry.secondsUntilStart - secondsSinceReport);
}

/** Today's entries left; null when the event has no daily limit. */
export function entriesLeft(entry: EventListEntry): number | null {
  return entry.entryLimit <= 0 ? null : Math.max(0, entry.entryLimit - entry.usedEntries);
}

export const isSpent = (entry: EventListEntry): boolean => entriesLeft(entry) === 0;
export const isFull = (entry: EventListEntry): boolean => entry.maxPlayers > 0 && entry.currentPlayers >= entry.maxPlayers;
export const occupancy = (entry: EventListEntry): number =>
  entry.maxPlayers <= 0 ? 0 : Math.min(1, Math.max(0, entry.currentPlayers / entry.maxPlayers));

export const EventList = observable(
  {
    /** In display order. */
    entries: [] as readonly EventListEntry[],
    /** When the report arrived, on the shared clock; null before the first. */
    receivedAtMs: null as number | null,
  },
  {},
  { deep: false }
);

/** Replaces the report: the server always sends the complete list. */
export function setEventList(entries: readonly EventListEntry[], nowMs: number): void {
  const ordered = orderForDisplay(entries);
  runInAction(() => {
    EventList.entries = ordered;
    EventList.receivedAtMs = nowMs;
  });
}

export function forgetEventList(): void {
  runInAction(() => {
    EventList.entries = [];
    EventList.receivedAtMs = null;
  });
}

/** The entry of one mini-game type in the last report. */
export function eventListEntry(type: number): EventListEntry | undefined {
  return EventList.entries.find(e => e.type === type || (type === MiniGameType.IllusionTemple && e.type === MiniGameType.CursedTemple));
}

/** Whole seconds since the report, on the shared clock. */
export function secondsSinceReport(nowMs: number): number {
  return EventList.receivedAtMs === null ? 0 : Math.max(0, Math.floor((nowMs - EventList.receivedAtMs) / 1000));
}
