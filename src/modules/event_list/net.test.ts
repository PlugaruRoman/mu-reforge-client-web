import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('../session');
const { eventSchedule } = await import('../events/schedule');
const { EventListPacket } = await import('@versions/reforge/packets/ServerToClientPackets');
const { installNet, buildEventListRequest, requestEventList } = await import('./net');
const { EventList, entriesLeft, isFull, isSpent, parseEventList, secondsUntilStart, UNKNOWN_SECONDS } = await import('./state');

installNet();

type Row = [type: number, state: number, seconds: number, current: number, max: number, used: number, limit: number];

/** S EventListViewPlugIn: `[C1][len][97][count]` + 10-byte entries, the seconds little endian. */
function frame(rows: Row[]): DataView {
  const length = 4 + rows.length * 10;
  const v = new DataView(new ArrayBuffer(length));
  v.setUint8(0, 0xc1);
  v.setUint8(1, length);
  v.setUint8(2, 0x97);
  v.setUint8(3, rows.length);
  rows.forEach(([type, state, seconds, current, max, used, limit], i) => {
    const o = 4 + i * 10;
    v.setUint8(o, type);
    v.setUint8(o + 1, state);
    v.setUint32(o + 2, seconds, true);
    v.setUint8(o + 6, current);
    v.setUint8(o + 7, max);
    v.setUint8(o + 8, used);
    v.setUint8(o + 9, limit);
  });
  return v;
}

// Blood Castle waiting 10 min, Devil Square open, Chaos Castle running, Illusion Temple unknown.
const REPORT: Row[] = [
  [2, 0, 600, 0, 15, 1, 3],
  [1, 1, 0, 4, 10, 3, 3],
  [4, 2, UNKNOWN_SECONDS, 70, 70, 0, 0],
  [5, 0, UNKNOWN_SECONDS, 0, 10, 0, 2],
];

describe('EventList (C1 97)', () => {
  it('reads what the generated EventListPacket reads', () => {
    const v = frame(REPORT);
    const generated = new EventListPacket(v).getEvents();
    expect(parseEventList(v).map(e => [e.type, e.state, e.secondsUntilStart, e.currentPlayers, e.maxPlayers, e.usedEntries, e.entryLimit])).toEqual(
      generated.map(e => [e.EventType, e.State, e.SecondsUntilStart, e.CurrentPlayers, e.MaxPlayers, e.UsedEntries, e.EntryLimit])
    );
  });

  it('keeps the list in display order: open, running, waiting by start, unknown last', () => {
    EventBus.emit('EventList', frame(REPORT));
    expect(EventList.entries.map(e => e.type)).toEqual([1, 4, 2, 5]);
    expect(EventList.receivedAtMs).not.toBeNull();
  });

  it('answers the row rules', () => {
    const [ds, cc, bc, it_] = EventList.entries;
    expect([entriesLeft(ds), isSpent(ds)]).toEqual([0, true]);
    expect([entriesLeft(cc), isFull(cc)]).toEqual([null, true]);
    expect(secondsUntilStart(bc, 30)).toBe(570);
    expect(secondsUntilStart(it_, 30)).toBeNull();
  });

  it('feeds the HUD schedule rows', () => {
    const rows = Object.fromEntries(eventSchedule().map(r => [r.key, r]));
    expect(rows.devilSquare.open).toBe(true);
    expect(rows.bloodCastle.seconds).toBeGreaterThan(590);
    expect(rows.bloodCastle.seconds).toBeLessThanOrEqual(600);
  });

  it('asks with C1 9F (MiniGameEventCountRequest)', () => {
    expect([...new Uint8Array(buildEventListRequest().buffer)]).toEqual([0xc1, 0x04, 0x9f, 0x02]);
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
    requestEventList();
    expect(send).toHaveBeenCalledTimes(1);
    send.mockRestore();
  });
});
