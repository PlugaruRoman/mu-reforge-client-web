import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Which modules the world has on: all of them unless a test turns one off.
const off = vi.hoisted(() => new Set<string>());
vi.mock('@/modules/module', async importOriginal => ({
  ...(await importOriginal<typeof import('@/modules/module')>()),
  moduleOn: (id: string) => !off.has(id),
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { MENU_ENTRIES, activateEntry, menuEntries } = await import('./entries');
const { ReforgeMenuWindow, REFORGE_MENU_WINDOW } = await import('.');
const { MuWindows } = await import('@/controllers/interface');
const { ReforgeHud } = await import('@/modules/reforge_hud');
const { ReforgeMarket } = await import('@/modules/reforge_market');
const { huntLogShown } = await import('@/modules/hunt_log');
const { Session } = await import('@/modules/session');
const { WindowMenu, chooseWindowMenu, WINDOW_MENU } = await import('../window_menu');

const entry = (id: string) => MENU_ENTRIES.find(e => e.id === id)!;

afterEach(() => {
  off.clear();
  runInAction(() => ReforgeHud.setGuest(false));
});

// UI/Reforge/ReforgeMenuEntries.cpp: the Windows tab, then the server switches.
describe('the Mu Reforge menu', () => {
  it('lists our client\'s windows with their keys, and only those whose module is on', () => {
    expect(MENU_ENTRIES.map(e => [e.id, e.key])).toEqual([
      ['reset', ''],
      ['add_stats', ''],
      ['jewel_bank', 'J'],
      ['event_timer', 'H'],
      ['vip_shop', 'K'],
      ['soul_points', 'S'],
      ['death_records', 'Y'],
      ['guest_access', 'L'],
      ['event_list', 'B'],
      ['hunt_log', ''],
      ['reforge_market', ''],
      ['item_collections', ';'],
      ['options', 'O'],
      ['requests', ''],
    ]);
    off.add('resets');
    off.add('reforge_market');
    const ids = menuEntries().map(e => e.id);
    expect(ids).not.toContain('reset');
    expect(ids).not.toContain('add_stats');
    expect(ids).not.toContain('reforge_market');
    expect(ids).toContain('options');
  });

  it('opens and closes a window row', () => {
    activateEntry(entry('jewel_bank'));
    expect(MuWindows.isOpen('jewel_bank')).toBe(true);
    expect(entry('jewel_bank').isOn()).toBe(true);
    activateEntry(entry('jewel_bank'));
    expect(MuWindows.isOpen('jewel_bank')).toBe(false);
  });

  it('shows the hunting log without the MU Helper, and opens the market board', () => {
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    try {
      activateEntry(entry('hunt_log'));
      expect(huntLogShown(false)).toBe(true);
      activateEntry(entry('hunt_log'));
      expect(huntLogShown(false)).toBe(false);
      activateEntry(entry('reforge_market'));
      expect(ReforgeMarket.isOpen).toBe(true);
      activateEntry(entry('reforge_market'));
      expect(ReforgeMarket.isOpen).toBe(false);
    } finally {
      send.mockRestore();
    }
  });

  it('keeps Guest Access from a guest login', () => {
    runInAction(() => ReforgeHud.setGuest(true));
    expect(activateEntry(entry('guest_access'))).toBe(false);
    expect(MuWindows.isOpen('guest_access')).toBe(false);
  });

  it('draws a row for each window and the requests switch under Settings', () => {
    runInAction(() => MuWindows.setOpen(REFORGE_MENU_WINDOW, true));
    const html = renderToStaticMarkup(<ReforgeMenuWindow />);
    expect(html).toContain('Jewel Bank (J)');
    expect(html).toContain('Market board');
    expect(html).toContain('Settings');
    expect(html).toContain('Allow requests');
    runInAction(() => MuWindows.setOpen(REFORGE_MENU_WINDOW, false));
  });
});

// The window menu's Gens row (Gens Info, NewUIWindowMenu.cpp) is the Mu Reforge menu where the module is on:
// the one way to it from the mobile menu button.
describe('the window menu row', () => {
  it('names and opens the Mu Reforge menu with reforge_hud on, Gens Info without it', () => {
    runInAction(() => MuWindows.setOpen(WINDOW_MENU, true));
    const labels = () => [...renderToStaticMarkup(<WindowMenu />).matchAll(/class="window-menu-label"[^>]*>([^<]+)</g)].map(m => m[1]);
    expect(labels()[5]).toBe('Mu Reforge (N)');
    chooseWindowMenu(5);
    expect(MuWindows.isOpen(REFORGE_MENU_WINDOW)).toBe(true);
    expect(MuWindows.isOpen(WINDOW_MENU)).toBe(false);
    runInAction(() => MuWindows.setOpen(REFORGE_MENU_WINDOW, false));

    off.add('reforge_hud');
    runInAction(() => MuWindows.setOpen(WINDOW_MENU, true));
    expect(labels()[5]).toBe('Gens Info (B)');
    chooseWindowMenu(5);
    expect(MuWindows.isOpen(REFORGE_MENU_WINDOW)).toBe(false);
    runInAction(() => MuWindows.setOpen(WINDOW_MENU, false));
  });
});
