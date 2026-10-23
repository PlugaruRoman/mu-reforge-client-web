import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
vi.mock('@/controllers/sound/sfx', async importOriginal => ({ ...(await importOriginal<object>()), playUiSound: () => 0 }));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { loadGameVersion } = await import('@/version');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('../session');
const { GuildBank, BankLock, isAcceptablePin } = await import('./state');
const { installNet } = await import('./net');

installNet();

const view = (bytes: number[]) => new DataView(Uint8Array.from(bytes).buffer);
let sent: number[][] = [];

beforeAll(() => loadGameVersion('reforge'), 120_000);
afterAll(() => loadGameVersion('season6'));
beforeEach(() => {
  sent = [];
  vi.spyOn(Session, 'sendToGS').mockImplementation((b: DataView) => void sent.push([...new Uint8Array(b.buffer)]));
});

/** C1 06 DC 08 [current][count] (S GuildBankViewPlugIn.ShowGuildBankPageInfoAsync). */
const pageInfo = (current: number, count: number) => view([0xc1, 6, 0xdc, 0x08, current, count]);
/** C1 05 DC 0C [state]. */
const lockState = (state: number) => view([0xc1, 5, 0xdc, 0x0c, state]);

/**
 * C2 DC 01 as GuildBankViewPlugIn.ShowGuildBankAsync writes it: zen u32 LE at 5, CanWithdraw at 9,
 * count at 10, then slot + ItemSerializerExtended bytes. Kris +7 (0/0, dur 30, luck + skill) in
 * slot 3 and a +13 excellent 0/5 (7 bytes) in slot 40.
 */
function bankList(money: number, canWithdraw: boolean): DataView {
  const body = [3, 0x00, 0x00, 7, 30, 0x06, 40, 0x00, 0x05, 13, 80, 0x0f, 0x04, 0x3f];
  const length = 11 + body.length;
  return view([0xc2, length >> 8, length & 0xff, 0xdc, 0x01, money & 0xff, (money >> 8) & 0xff, (money >> 16) & 0xff, money >>> 24, canWithdraw ? 1 : 0, 2, ...body]);
}

describe('guild bank (DC)', () => {
  it('opens on DC 08 and fills the page from DC 01', () => {
    GuildBank.close(false);
    EventBus.emit('GuildBankPageInfo', pageInfo(1, 3));
    EventBus.emit('GuildBankLockState', lockState(BankLock.None));
    EventBus.emit('GuildBankItemList', bankList(1_234_567, true));
    expect(GuildBank.open).toBe(true);
    expect([GuildBank.page, GuildBank.pageCount]).toEqual([1, 3]);
    expect(GuildBank.money).toBe(1_234_567);
    expect(GuildBank.canWithdraw).toBe(true);
    expect(GuildBank.items[3]).toMatchObject({ group: 0, num: 0, lvl: 7, luck: true, hasSkill: true });
    expect(GuildBank.items[40]).toMatchObject({ group: 0, num: 5, lvl: 13, isExcellent: true });
    expect(GuildBank.items.filter(Boolean)).toHaveLength(2);
  });

  it('a locked bank hides its items and asks for the PIN', () => {
    EventBus.emit('GuildBankLockState', lockState(BankLock.Locked));
    expect(GuildBank.locked).toBe(true);
    expect(GuildBank.items.filter(Boolean)).toHaveLength(0);
    expect(GuildBank.prompt).toBe('unlock');
    EventBus.emit('GuildBankLockState', lockState(BankLock.Unlocked));
    expect(GuildBank.prompt).toBeNull();
  });

  it('ignores a list while closed', () => {
    GuildBank.close(false);
    EventBus.emit('GuildBankItemList', bankList(5, true));
    expect(GuildBank.money).toBe(0);
  });

  it('builds every request as the server handlers read it', () => {
    EventBus.emit('GuildBankPageInfo', pageInfo(0, 3));
    EventBus.emit('GuildBankItemList', bankList(100, true));
    sent = [];
    GuildBank.deposit(20, 7);
    GuildBank.deposit(20);
    GuildBank.withdraw(3);
    GuildBank.select(3);
    GuildBank.moveSelected(60);
    GuildBank.moveMoney(true, 0x01020304);
    GuildBank.moveMoney(false, 50);
    GuildBank.changePage(1);
    GuildBank.unlock('1234');
    GuildBank.setPin('4321');
    GuildBank.removePin();
    GuildBank.close();
    expect(sent).toEqual([
      [0xc1, 6, 0xdc, 0x03, 20, 7],
      [0xc1, 6, 0xdc, 0x03, 20, 0xff],
      [0xc1, 5, 0xdc, 0x04, 3],
      [0xc1, 6, 0xdc, 0x10, 3, 60],
      [0xc1, 9, 0xdc, 0x05, 0, 0x04, 0x03, 0x02, 0x01],
      [0xc1, 9, 0xdc, 0x05, 1, 50, 0, 0, 0],
      [0xc1, 5, 0xdc, 0x07, 1],
      [0xc1, 6, 0xdc, 0x0a, 1234 & 0xff, 1234 >> 8],
      [0xc1, 6, 0xdc, 0x09, 4321 & 0xff, 4321 >> 8],
      [0xc1, 4, 0xdc, 0x0b],
      [0xc1, 4, 0xdc, 0x06],
    ]);
  });

  it('refuses a worn item and sends nothing without the withdraw right', () => {
    EventBus.emit('GuildBankPageInfo', pageInfo(0, 3));
    EventBus.emit('GuildBankItemList', bankList(100, false));
    sent = [];
    expect(GuildBank.deposit(5)).toBe(false);
    GuildBank.withdraw(3);
    GuildBank.moveMoney(false, 10);
    expect(sent).toEqual([]);
    GuildBank.close(false);
  });

  it('reads and saves the per-rank rights (DC 0D / 0E)', () => {
    GuildBank.openSettings(true);
    EventBus.emit('GuildSettingsResponse', view([0xc1, 12, 0xdc, 0x0d, 254, 0, 0, 0, 28, 0, 0, 0]));
    expect([GuildBank.depositFlags, GuildBank.withdrawFlags]).toEqual([254, 28]);
    GuildBank.toggleRight(7, false); // recruit may no longer deposit
    GuildBank.toggleRight(6, true); // elite members may withdraw
    expect(GuildBank.settingsDirty).toBe(true);
    GuildBank.saveSettings();
    expect(sent.at(-1)).toEqual([0xc1, 12, 0xdc, 0x0e, 126, 0, 0, 0, 92, 0, 0, 0]);
    EventBus.emit('GuildSettingsResponse', view([0xc1, 12, 0xdc, 0x0d, 126, 0, 0, 0, 92, 0, 0, 0]));
    expect(GuildBank.settingsSaved).toBe(true);
    expect(GuildBank.settingsDirty).toBe(false);
    expect(sent[0]).toEqual([0xc1, 4, 0xdc, 0x0d]);
    GuildBank.openSettings(false);
  });

  it('asks for the castle and warps in (DC 0F)', () => {
    GuildBank.askCastle();
    EventBus.emit('GuildCastleWarpState', view([0xc1, 5, 0xdc, 0x0f, 1]));
    expect(GuildBank.ownsCastle).toBe(true);
    GuildBank.warpToCastle();
    expect(sent).toEqual([
      [0xc1, 5, 0xdc, 0x0f, 0],
      [0xc1, 5, 0xdc, 0x0f, 1],
    ]);
  });

  it('takes four digits, not all the same', () => {
    expect(isAcceptablePin('1234')).toBe(true);
    expect(isAcceptablePin('1111')).toBe(false);
    expect(isAcceptablePin('123')).toBe(false);
  });
});
