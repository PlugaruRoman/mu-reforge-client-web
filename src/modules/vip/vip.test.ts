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
const { Vip, VipBuyResult, ALL_INCLUSIVE } = await import('./state');

installNet();
const sent: number[][] = [];
vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push([...new Uint8Array(b.buffer)]));

const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
const frame = (bytes: number[]) => new DataView(Uint8Array.from(bytes).buffer);

/** S RemoteView/Vip/VipViewPlugIn.cs: `[C1][40][D7][01][4 x remaining u32][wcoin u32][4 x price u32]`. */
const status = (remaining: number[], wcoin: number, prices: number[]) =>
  frame([0xc1, 40, 0xd7, 0x01, ...remaining.flatMap(u32), ...u32(wcoin), ...prices.flatMap(u32)]);

beforeEach(() => {
  sent.length = 0;
});

describe('VIP status and purchase (C1 D7)', () => {
  it('reads the times, the balance and the prices of D7 01', () => {
    EventBus.emit('VipStatus', status([3600, 0, 0, 0], 25_000, [1000, 1200, 800, 2500]));
    expect(Vip.remaining).toEqual([3600, 0, 0, 0]);
    expect(Vip.wcoin).toBe(25_000);
    expect(Vip.prices).toEqual([1000, 1200, 800, 2500]);
    expect(Vip.isActive(0)).toBe(true);
    expect(Vip.bundleSavings).toBe(500);
    expect(Vip.replacesSingles(ALL_INCLUSIVE)).toBe(true);
  });

  it('counts the time down from the report', () => {
    Vip.setStatus([100, 0, 0, 0], 0, [1, 1, 1, 1], 10_000);
    expect(Vip.remainingAt(0, 40_000)).toBe(70);
    expect(Vip.remainingAt(0, 200_000)).toBe(0);
  });

  it('blocks single tiers while All Inclusive runs and says why', () => {
    Vip.setStatus([0, 0, 0, 3600], 100, [1000, 1000, 1000, 2500]);
    expect(Vip.refusal(0)).toBe('included');
    expect(Vip.refusal(ALL_INCLUSIVE)).toBe('wcoin');
  });

  it('sends the info request and the buy with the server tier (index + 1)', () => {
    Vip.requestStatus();
    Vip.buy(2);
    expect(sent).toEqual([
      [0xc1, 4, 0xd7, 0x01],
      [0xc1, 5, 0xd7, 0x02, 3],
    ]);
  });

  it('reads the buy answer of D7 02 and frees the buttons', () => {
    EventBus.emit('VipBuyResult', frame([0xc1, 25, 0xd7, 0x02, VipBuyResult.NotEnoughMoney, ...u32(7), ...u32(0), ...u32(0), ...u32(0), ...u32(42)]));
    expect(Vip.answer?.result).toBe(VipBuyResult.NotEnoughMoney);
    expect(Vip.remaining).toEqual([7, 0, 0, 0]);
    expect(Vip.wcoin).toBe(42);
    expect(Vip.buyPending).toBe(false);
  });
});
