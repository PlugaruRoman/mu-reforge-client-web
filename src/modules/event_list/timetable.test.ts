import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { TIMER_ENTRIES, TVT_TIMETABLE, countdownText, stateAt, timerRowState, timerRows, utcMomentOf } = await import('./timetable');
const { setEventList } = await import('./state');
const { setInvasionStatuses } = await import('../invasions/state');

/** 2026-10-21 (a Wednesday) at hh:mm:ss UTC. */
const at = (h: number, m: number, s = 0) => Date.UTC(2026, 9, 21, h, m, s);
const entry = (id: string) => {
  const found = TIMER_ENTRIES.find(e => e.id === id);
  if (!found) throw new Error(`no timer entry ${id}`);
  return found;
};

describe('the Event Timer timetable (EventTimerEntries.cpp)', () => {
  it('reads the weekday on the UTC clock', () => {
    expect(utcMomentOf(at(0, 0))).toEqual({ secondOfDay: 0, dayOfWeek: 3 });
  });

  it('counts down to the next start of an interval timetable, strictly after now', () => {
    // Blood Castle: every 120 minutes from 00:30, 5 minutes open.
    const bc = entry('bloodCastle').timetable;
    expect(stateAt(bc, utcMomentOf(at(1, 0)))).toEqual({ running: false, secondsToStart: 90 * 60, secondsToEnd: 0 });
    expect(stateAt(bc, utcMomentOf(at(2, 32)))).toEqual({ running: true, secondsToStart: 118 * 60, secondsToEnd: 180 });
  });

  it('keeps a run going across midnight', () => {
    // Selupan at 23:31 for 120 minutes is still running at 00:10.
    const s = stateAt(entry('selupan').timetable, utcMomentOf(at(0, 10)));
    expect(s.running).toBe(true);
    expect(s.secondsToEnd).toBe(81 * 60);
  });

  it('runs a weekly timetable on its days only', () => {
    // Fort Siege: Tuesday and Friday 16:00. From Wednesday 16:00, Friday is two days off.
    expect(stateAt(entry('fortSiege').timetable, utcMomentOf(at(16, 0))).secondsToStart).toBe(2 * 86_400);
    // TvT: 02:00, 10:00, 18:00, 22:00.
    expect(stateAt(TVT_TIMETABLE, utcMomentOf(at(9, 0))).secondsToStart).toBe(3600);
  });

  it('lets the server event list win for a mini-game row', () => {
    const now = at(1, 0);
    setEventList([{ type: 2, state: 1, secondsUntilStart: 0, currentPlayers: 0, maxPlayers: 15, usedEntries: 0, entryLimit: 0 }], now);
    expect(timerRowState(entry('bloodCastle'), now)).toMatchObject({ fromServer: true, run: { running: true } });
    setEventList([{ type: 2, state: 0, secondsUntilStart: 300, currentPlayers: 0, maxPlayers: 15, usedEntries: 0, entryLimit: 0 }], now);
    expect(timerRowState(entry('bloodCastle'), now + 60_000).run).toEqual({ running: false, secondsToStart: 240, secondsToEnd: 0 });
  });

  it('lays a beaten invasion over its row and sorts it after the live ones', () => {
    const now = at(0, 40);
    setInvasionStatuses([{ id: 5, phase: 2, alive: 0, total: 1, secondsToEnd: 1800, secondsSinceDefeat: 60, killer: 'Hero', hostServer: 0 }], now);
    const { rows, live } = timerRows('invasions', now);
    const icarus = rows.find(r => r.entry.id === 'icarusOverlord');
    if (!icarus) throw new Error('no icarusOverlord row');
    expect(icarus.state.defeated).toBe(true);
    // The live rows first, ending soonest on top: Karmaije (23:33 + 90 min) ends at 01:03, Skeleton
    // King (00:37 + 40) at 01:17, Anubis at 01:19; the beaten Icarus Overlord comes after them.
    expect(rows.slice(0, 3).map(r => r.entry.id)).toEqual(['karmaije', 'skeletonKing', 'anubis']);
    const firstBeaten = rows.findIndex(r => r.state.defeated);
    expect(rows.slice(0, firstBeaten).every(r => r.state.run.running)).toBe(true);
    expect(rows[firstBeaten].entry.id).toBe('icarusOverlord');
    expect(live.invasions).toBe(true);
  });

  it('prints the countdown as our client does', () => {
    expect(countdownText(3725)).toBe('01:02:05');
    expect(countdownText(2 * 86_400 + 3 * 3600)).toBe('2d 03h');
  });
});
