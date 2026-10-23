import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { MuWindows } = await import('@/controllers/interface/windowManager');
const { Session } = await import('../session');
const { installNet, enterDeepDungeon, DEEP_DUNGEON_WINDOW } = await import('./net');
const { DeepDungeon, buildEnterRequest, hudUrgency, parseFloorSelection, secondsLeft, suggestedFloor, windowUrgency } = await import('./state');

installNet();

/** S DeepDungeonViewPlugIn.ShowFloorSelectionAsync: `[C1][10][E3][01][floors][minutes][level u16][seconds u16]`. */
const selection = (floors: number, minutes: number, level: number, seconds?: number) => {
  const length = seconds === undefined ? 8 : 10;
  const v = new DataView(new ArrayBuffer(length));
  [0xc1, length, 0xe3, 0x01, floors, minutes].forEach((b, i) => v.setUint8(i, b));
  v.setUint16(6, level, true);
  if (seconds !== undefined) v.setUint16(8, seconds, true);
  return v;
};

describe('Deep Dungeon (C1 E3)', () => {
  it('reads both forms of the floor selection (E3 01) and opens the window', () => {
    expect(parseFloorSelection(selection(5, 12, 400))).toEqual({ floorCount: 5, minimumLevel: 400, remainingSeconds: 720 });
    expect(parseFloorSelection(selection(9, 12, 400, 705))).toEqual({ floorCount: 5, minimumLevel: 400, remainingSeconds: 705 });
    EventBus.emit('DeepDungeonFloorSelection', selection(3, 20, 350, 1199));
    expect(DeepDungeon.selection).toEqual({ floorCount: 3, minimumLevel: 350, remainingSeconds: 1199 });
    expect(MuWindows.isOpen(DEEP_DUNGEON_WINDOW)).toBe(true);
  });

  it('reads the countdown (E3 03)', () => {
    EventBus.emit('DeepDungeonCountdown', new DataView(Uint8Array.from([0xc1, 0x07, 0xe3, 0x03, 2, 0x2c, 0x01]).buffer));
    expect(DeepDungeon.countdown).toEqual({ floor: 2, remainingSeconds: 300 });
  });

  it('enters with [C1][05][E3][02][floor] and closes the window', () => {
    expect([...new Uint8Array(buildEnterRequest(4).buffer)]).toEqual([0xc1, 0x05, 0xe3, 0x02, 4]);
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
    enterDeepDungeon(2);
    expect(send).toHaveBeenCalledTimes(1);
    expect(MuWindows.isOpen(DEEP_DUNGEON_WINDOW)).toBe(false);
    send.mockRestore();
  });

  it('follows the floor ladder and the timers of our client', () => {
    expect([0, 10, 11, 35, 99].map(r => suggestedFloor(r, 5))).toEqual([0, 0, 1, 3, 4]);
    expect(suggestedFloor(99, 3)).toBe(2);
    expect(secondsLeft(100, 30_900)).toBe(70);
    expect(secondsLeft(10, 60_000)).toBe(0);
    expect([windowUrgency(601), windowUrgency(600), windowUrgency(180)]).toEqual(['calm', 'soon', 'last']);
    expect([hudUrgency(301), hudUrgency(300), hudUrgency(60)]).toEqual(['calm', 'soon', 'last']);
  });
});
