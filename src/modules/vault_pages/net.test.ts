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
const { Economy } = await import('../economy/economy');
const { VaultPages } = await import('./state');
const { installNet } = await import('./net');

installNet();

let sent: number[][] = [];

beforeAll(() => loadGameVersion('reforge'), 120_000);
afterAll(() => loadGameVersion('season6'));
beforeEach(() => {
  sent = [];
  vi.spyOn(Session, 'sendToGS').mockImplementation((b: DataView) => void sent.push([...new Uint8Array(b.buffer)]));
  Economy.closeVault(false);
});

/** C2 00 07 DD 00 [current][count] (S VaultPageInfoRef via SendVaultPageInfoAsync, ServerToClientPackets.xml VaultPageInfo). */
const pageInfo = (current: number, count: number) => new DataView(Uint8Array.from([0xc2, 0, 7, 0xdd, 0x00, current, count]).buffer);

describe('vault pages (DD 00)', () => {
  it('reads the page info frame', () => {
    Economy.openVault();
    EventBus.emit('VaultPageInfo', pageInfo(1, 5));
    expect([VaultPages.current, VaultPages.count, VaultPages.paged, VaultPages.hasPrev, VaultPages.hasNext]).toEqual([1, 5, true, true, true]);
  });

  it('ignores a current page outside the count', () => {
    Economy.openVault();
    EventBus.emit('VaultPageInfo', pageInfo(0, 3));
    EventBus.emit('VaultPageInfo', pageInfo(3, 3));
    expect([VaultPages.current, VaultPages.count]).toEqual([0, 3]);
  });

  it('asks for the next page as C1 05 DD 00 [page] (S VaultPageChangeRequestHandlerPlugIn) and empties the grid', () => {
    Economy.openVault();
    EventBus.emit('VaultPageInfo', pageInfo(0, 3));
    expect(VaultPages.request(1)).toBe(true);
    expect(sent).toEqual([[0xc1, 5, 0xdd, 0x00, 1]]);
    expect(Economy.vaultItems.every(i => i === null)).toBe(true);
  });

  it('refuses past the last page and on a locked vault', () => {
    Economy.openVault();
    EventBus.emit('VaultPageInfo', pageInfo(2, 3));
    expect(VaultPages.request(1)).toBe(false);
    Economy.vaultLocked = true;
    expect(VaultPages.request(-1)).toBe(false);
    Economy.vaultLocked = false;
    expect(sent).toEqual([]);
  });

  it('forgets the pages when the vault closes', () => {
    Economy.openVault();
    EventBus.emit('VaultPageInfo', pageInfo(1, 5));
    Economy.closeVault(false);
    expect([VaultPages.current, VaultPages.count, VaultPages.paged]).toEqual([0, 0, false]);
  });
});
