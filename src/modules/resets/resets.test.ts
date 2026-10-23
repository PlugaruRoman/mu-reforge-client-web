import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('@/modules/session');
const { Hero } = await import('@/modules/hero');
const { installNet } = await import('./net');
const { Resets, PaidResetResult, Payment, ResetReason, canAfford, canPaidReset, planBulk, pointsPerTrigger, nextTriggerLevel } = await import('./state');

installNet();
const sent: number[][] = [];
vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push([...new Uint8Array(b.buffer)]));

const u16 = (n: number) => [n & 0xff, n >> 8];
const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
const frame = (bytes: number[]) => new DataView(Uint8Array.from(bytes).buffer);

beforeEach(() => {
  sent.length = 0;
});

// S RemoteView/Reset/ResetInfoViewPlugIn.cs and RemoteView/Character/AutoStatConfigurationViewPlugIn.cs.
describe('reset info (C1 D9 01 / 02)', () => {
  it('reads the next reset', () => {
    EventBus.emit('ResetInfo', frame([0xc1, 14, 0xd9, 0x01, 0, ResetReason.NotEnoughZen, ...u16(400), ...u32(5_000_000), ...u16(12)]));
    expect(Resets.reset).toEqual({ canReset: false, reason: ResetReason.NotEnoughZen, requiredLevel: 400, requiredZen: 5_000_000, currentResets: 12 });
  });

  it('reads the next grand reset', () => {
    EventBus.emit('GrandResetInfo', frame([0xc1, 20, 0xd9, 0x02, 1, 0, ...u16(50), ...u16(400), ...u32(100_000_000), ...u16(2), ...u16(55), ...u16(10)]));
    expect(Resets.grand).toEqual({
      canReset: true,
      reason: ResetReason.Ok,
      requiredResets: 50,
      requiredLevel: 400,
      requiredZen: 100_000_000,
      currentGrandResets: 2,
      currentResets: 55,
      limit: 10,
    });
  });

  it('asks for both on open and resets through the chat commands', () => {
    Resets.requestInfo();
    expect(sent).toEqual([
      [0xc1, 4, 0xd9, 0x01],
      [0xc1, 4, 0xd9, 0x02],
    ]);
    sent.length = 0;
    Hero.name = 'Hero';
    Resets.doReset(false);
    Resets.doReset(true);
    const text = sent.map(b => String.fromCharCode(...b.slice(13).filter(c => c !== 0)));
    expect(text).toEqual(['/reset', '/grandreset']);
  });
});

describe('paid resets (C1 D9 03-06)', () => {
  const costInfo = (sub: number, reason: number) =>
    frame([0xc1, 35, 0xd9, sub, ...[500, 30, 4, 300, 20, 20, 1234].flatMap(u32), ...u16(380), reason]);

  it('reads the stat reset price list and its precondition', () => {
    EventBus.emit('StatResetInfo', costInfo(0x03, PaidResetResult.Success));
    const info = Resets.paid.stats;
    if (!info) throw new Error('no stat reset info');
    expect(info).toEqual({ balances: [500, 30, 4], costs: [300, 20, 20], refundable: 1234, requiredLevel: 380, precondition: PaidResetResult.Success });
    expect(canPaidReset(info)).toBe(true);
    expect(canAfford(info, Payment.WCoin)).toBe(true);
    expect(canAfford(info, Payment.Jewels)).toBe(false);
  });

  it('reads the master reset list on D9 05', () => {
    EventBus.emit('MasterResetInfo', costInfo(0x05, PaidResetResult.NotMasterClass));
    expect(Resets.paid.master?.precondition).toBe(PaidResetResult.NotMasterClass);
  });

  it('pays with the chosen payment and takes the result', () => {
    Resets.payPaid('stats', Payment.Jewels);
    Resets.payPaid('master', Payment.WCoin);
    expect(sent).toEqual([
      [0xc1, 5, 0xd9, 0x04, 1],
      [0xc1, 5, 0xd9, 0x06, 0],
    ]);
    EventBus.emit('MasterResetResult', frame([0xc1, 5, 0xd9, 0x06, PaidResetResult.NotInSafezone]));
    expect(Resets.paidResult).toEqual({ reset: 'master', result: PaidResetResult.NotInSafezone });
  });
});

describe('auto stat (C1 D9 07 / 08) and the bulk add (F3 06)', () => {
  it('reads the stored settings', () => {
    EventBus.emit('AutoStatConfiguration', frame([0xc1, 13, 0xd9, 0x07, 1, 5, 40, 30, 20, 10, 0, ...u16(7)]));
    expect(Resets.auto).toEqual({ enabled: true, interval: 5, percents: [40, 30, 20, 10, 0] });
    expect(Resets.pointsPerLevelUp).toBe(7);
  });

  it('saves the clamped settings', () => {
    Resets.saveAuto({ enabled: false, interval: 250, percents: [120, 0, 0, 0, 0] });
    expect(sent).toEqual([[0xc1, 11, 0xd9, 0x08, 0, 100, 100, 0, 0, 0, 0]]);
  });

  it('adds an amount in one request, big endian at 5', () => {
    Resets.addPoints(2, 300);
    Resets.addPoints(0, 0);
    expect(sent).toEqual([[0xc1, 7, 0xf3, 0x06, 2, 0x01, 0x2c]]);
  });

  it('plans the bulk add with a Full row', () => {
    expect(planBulk([10, 0, 0, 0, 0], 1, 4, 100)).toEqual({ amounts: [10, 90, 0, 0], total: 100, status: 'ready' });
    expect(planBulk([80, 30, 0, 0], -1, 4, 100).status).toBe('tooMany');
    expect(planBulk([0, 0, 0, 0], -1, 4, 0).status).toBe('noPoints');
  });

  it('previews the points of an interval', () => {
    expect(pointsPerTrigger(7, 5, 40)).toBe(14);
    expect(nextTriggerLevel(23, 5)).toBe(25);
  });
});
