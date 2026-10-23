import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('@/modules/session');
const { installNet } = await import('./net');
const { SoulPoints, SoulPayment, SoulResetResult, reachedMilestone, primaryValue } = await import('./state');

installNet();
const sent: number[][] = [];
vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push([...new Uint8Array(b.buffer)]));

const u16 = (n: number) => [n & 0xff, n >> 8];
const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];

/** S RemoteView/SoulPoints/SoulPointViewPlugIn.cs: free points, count, 5-byte slots, 3 balances, 3 costs. */
function info(available: number, slots: [number, number, number][], balances: number[], costs: number[]) {
  const body = [
    ...u32(available),
    slots.length,
    ...slots.flatMap(([type, points, cap]) => [type, ...u16(points), ...u16(cap)]),
    ...[...balances, ...costs].flatMap(u32),
  ];
  return new DataView(Uint8Array.from([0xc1, 4 + body.length, 0xde, 0x01, ...body]).buffer);
}

beforeEach(() => {
  sent.length = 0;
});

describe('Soul Points (C1 DE)', () => {
  it('reads the free points, the slots and the reset prices of DE 01', () => {
    EventBus.emit('SoulPointInfo', info(25, [[0, 40, 100], [11, 20, 60]], [1000, 50, 3], [500, 500, 10]));
    expect(SoulPoints.known).toBe(true);
    expect(SoulPoints.available).toBe(25);
    expect(SoulPoints.allocated[0]).toBe(40);
    expect(SoulPoints.allocated[11]).toBe(20);
    expect(SoulPoints.caps[11]).toBe(60);
    expect(SoulPoints.balances).toEqual([1000, 50, 3]);
    expect(SoulPoints.costs).toEqual([500, 500, 10]);
    expect(SoulPoints.investedTotal).toBe(60);
  });

  it('steps the plan between the committed points, the cap and the points left', () => {
    EventBus.emit('SoulPointInfo', info(12, [[0, 95, 100]], [0, 0, 0], [0, 0, 0]));
    expect(SoulPoints.stepPlan(0, -1)).toBe(false);
    expect(SoulPoints.stepPlan(0, 10)).toBe(true);
    expect(SoulPoints.planned[0]).toBe(100);
    expect(SoulPoints.stepPlan(1, 10)).toBe(true);
    expect(SoulPoints.planned[1]).toBe(7);
    expect(SoulPoints.left).toBe(0);
    expect(SoulPoints.pendingTotal).toBe(12);
  });

  it('invests the whole plan (DE 02 [16] then [type][points u16 LE] each)', () => {
    EventBus.emit('SoulPointInfo', info(300, [], [0, 0, 0], [0, 0, 0]));
    SoulPoints.stepPlan(3, 10);
    SoulPoints.invest();
    const packet = sent[0];
    expect(packet.slice(0, 5)).toEqual([0xc1, 53, 0xde, 0x02, 16]);
    expect(packet.length).toBe(53);
    expect(packet.slice(5 + 3 * 3, 5 + 4 * 3)).toEqual([3, 10, 0]);
  });

  it('pays the reset and reads its answer (DE 03)', () => {
    SoulPoints.reset(SoulPayment.Bless);
    expect(sent).toEqual([[0xc1, 5, 0xde, 0x03, 2]]);
    EventBus.emit('SoulPointResetResult', new DataView(Uint8Array.from([0xc1, 5, 0xde, 0x03, SoulResetResult.NotEnoughJewels]).buffer));
    expect(SoulPoints.lastReset).toBe(SoulResetResult.NotEnoughJewels);
  });

  it('knows the milestones and the bonus of our server table', () => {
    expect(reachedMilestone(0, 69)).toBe(0);
    expect(reachedMilestone(3, 60)).toBe(2);
    expect(primaryValue(11, 30)).toBe(90);
  });
});
