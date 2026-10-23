import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('../session');
const { installNet, buildInvasionStatusRequest, requestInvasionStatus } = await import('./net');
const { Invasions, applyInvasionStatus, findRunning, parseInvasionStatus, NOT_DEFEATED } = await import('./state');

installNet();

type Entry = { id: number; phase: number; alive: number; total: number; toEnd: number; sinceDefeat: number; killer: string; host: number };

/** S InvasionStatusViewPlugIn.ShowInvasionStatusAsync: `[C2][len BE][CC][01][count]` + 31-byte entries, LE. */
function frame(entries: Entry[]): DataView {
  const length = 6 + entries.length * 31;
  const b = new Uint8Array(length);
  const v = new DataView(b.buffer);
  b.set([0xc2, length >> 8, length & 0xff, 0xcc, 0x01, entries.length]);
  entries.forEach((e, i) => {
    const o = 6 + i * 31;
    b[o] = e.id;
    b[o + 1] = e.phase;
    v.setUint16(o + 2, e.alive, true);
    v.setUint16(o + 4, e.total, true);
    v.setUint32(o + 6, e.toEnd, true);
    v.setUint32(o + 10, e.sinceDefeat, true);
    b.set(new TextEncoder().encode(e.killer), o + 14);
    b[o + 30] = e.host;
  });
  return v;
}

const kundun: Entry = { id: 13, phase: 2, alive: 1, total: 1, toEnd: 3600, sinceDefeat: NOT_DEFEATED, killer: '', host: 0 };
const slain: Entry = { id: 5, phase: 2, alive: 0, total: 1, toEnd: 1200, sinceDefeat: 90, killer: 'Hero', host: 0 };
const elsewhere: Entry = { id: 1, phase: 3, alive: 0, total: 0, toEnd: 0, sinceDefeat: NOT_DEFEATED, killer: '', host: 2 };

describe('InvasionStatus (C2 CC 01)', () => {
  it('reads the 31-byte entries and the killer name', () => {
    const [a, b] = parseInvasionStatus(frame([kundun, slain]));
    expect(a).toMatchObject({ id: 13, phase: 2, alive: 1, total: 1, secondsToEnd: 3600, secondsSinceDefeat: NOT_DEFEATED, killer: '', hostServer: 0 });
    expect(b).toMatchObject({ id: 5, alive: 0, secondsSinceDefeat: 90, killer: 'Hero' });
  });

  it('keeps the count inside the frame', () => {
    const v = frame([kundun]);
    v.setUint8(5, 9);
    expect(parseInvasionStatus(v)).toHaveLength(1);
  });

  it('replaces the last report with each new one', () => {
    EventBus.emit('InvasionStatus', frame([kundun, slain]));
    expect([...Invasions.statuses.keys()]).toEqual([13, 5]);
    EventBus.emit('InvasionStatus', frame([elsewhere]));
    expect([...Invasions.statuses.keys()]).toEqual([1]);
  });

  it('lays the server status over a row (ApplyTo)', () => {
    EventBus.emit('InvasionStatus', frame([kundun, slain, elsewhere]));
    const status = Invasions.statuses.get(5);
    if (!status) throw new Error('no status for invasion 5');
    const now = status.receivedAtMs;
    const idle = { running: false, secondsToStart: 600, secondsToEnd: 0 };
    // Beaten: still in its window, so it counts as running and shows as defeated.
    expect(applyInvasionStatus(5, now + 10_000, idle)).toMatchObject({ defeated: true, run: { running: true, secondsToEnd: 1190 } });
    expect(applyInvasionStatus(13, now, idle)).toMatchObject({ defeated: false, alive: 1, total: 1 });
    expect(applyInvasionStatus(1, now, idle)).toMatchObject({ otherServer: 2 });
    // Past the reported end the report describes nothing.
    expect(findRunning(5, now + 1_200_000)).toBeNull();
  });

  it('asks with [C1][04][CC][01]', () => {
    expect([...new Uint8Array(buildInvasionStatusRequest().buffer)]).toEqual([0xc1, 0x04, 0xcc, 0x01]);
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
    requestInvasionStatus();
    expect(send).toHaveBeenCalledTimes(1);
    send.mockRestore();
  });
});
