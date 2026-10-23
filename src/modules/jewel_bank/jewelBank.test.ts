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
const { JewelBank, isDepositable, JewelBankSource } = await import('./state');

installNet();
const sent: number[][] = [];
vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push([...new Uint8Array(b.buffer)]));

const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];

beforeEach(() => {
  sent.length = 0;
});

describe('jewel bank (C1 D3)', () => {
  it('reads the 14 counts of JewelBankList (D3 01, 60 bytes)', () => {
    const counts = Array.from({ length: 14 }, (_, i) => i * 10);
    EventBus.emit('JewelBankList', new DataView(Uint8Array.from([0xc1, 60, 0xd3, 0x01, ...counts.flatMap(u32)]).buffer));
    expect(JewelBank.counts).toEqual(counts);
  });

  it('leaves the jewels a shorter list lacks at 0', () => {
    EventBus.emit('JewelBankList', new DataView(Uint8Array.from([0xc1, 12, 0xd3, 0x01, ...u32(5), ...u32(9)]).buffer));
    expect(JewelBank.counts.slice(0, 3)).toEqual([5, 9, 0]);
  });

  it('withdraws the selected amount (D3 04 [jewel][amount]) only when stored', () => {
    JewelBank.setCounts([25, 0, ...new Array(12).fill(0)]);
    JewelBank.selectAmount(2); // x20
    expect(JewelBank.withdraw(0)).toBe(true);
    expect(JewelBank.withdraw(1)).toBe(false);
    JewelBank.selectAmount(3); // x30
    expect(JewelBank.withdraw(0)).toBe(false);
    expect(sent).toEqual([[0xc1, 6, 0xd3, 0x04, 0, 20]]);
  });

  it('deposits a bag slot (D3 03 [slot][source]) of a jewel the bank keeps', () => {
    expect(JewelBank.deposit(20, { group: 14, num: 13, lvl: 0 })).toBe(true);
    expect(JewelBank.deposit(21, { group: 12, num: 31, lvl: 2 }, JewelBankSource.Vault)).toBe(true);
    expect(JewelBank.deposit(22, { group: 14, num: 13, lvl: 1 })).toBe(false);
    expect(JewelBank.deposit(23, { group: 0, num: 0 })).toBe(false);
    expect(sent).toEqual([
      [0xc1, 6, 0xd3, 0x03, 20, 0],
      [0xc1, 6, 0xd3, 0x03, 21, 2],
    ]);
  });

  it('keeps our four jewels without a packed form', () => {
    expect(isDepositable({ group: 14, num: 176 })).toBe(true);
    expect(isDepositable({ group: 12, num: 15 })).toBe(true);
  });

  it('asks for the list (D3 02)', () => {
    JewelBank.requestList();
    expect(sent).toEqual([[0xc1, 4, 0xd3, 0x02]]);
  });
});
