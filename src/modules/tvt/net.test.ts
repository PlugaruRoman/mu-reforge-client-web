import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { MuWindows } = await import('@/controllers/interface/windowManager');
const { Merchant, takeNpcClick } = await import('../npc_shop');
const { installNet, joinTvt, TVT_WINDOW } = await import('./net');
const { Tvt, tvtSecondsLeft, tvtTeamOf, BLUE_TEAM, RED_TEAM } = await import('./state');

installNet();

/** S TvtScoreViewPlugIn.ShowTvtScoreAsync: 13 bytes + `[key u16 LE][team]` per fighter. */
function score(active: boolean, blue: number, red: number, seconds: number, own: number, roster: [number, number][]): DataView {
  const length = 13 + roster.length * 3;
  const v = new DataView(new ArrayBuffer(length));
  [0xc1, length, 0xe2, 0x01, active ? 1 : 0].forEach((b, i) => v.setUint8(i, b));
  v.setUint16(5, blue, true);
  v.setUint16(7, red, true);
  v.setUint16(9, seconds, true);
  v.setUint8(11, own);
  v.setUint8(12, roster.length);
  roster.forEach(([key, team], i) => {
    v.setUint16(13 + i * 3, key, true);
    v.setUint8(15 + i * 3, team);
  });
  return v;
}

const registration = (open: boolean) => new DataView(Uint8Array.from([0xc1, 0x05, 0xe2, 0x02, open ? 1 : 0]).buffer);

describe('Team vs Team (C1 E2)', () => {
  it('reads the score, the time and the roster (E2 01)', () => {
    EventBus.emit('TvtScore', score(true, 7, 300, 540, RED_TEAM, [[0x1234, BLUE_TEAM], [0x0042, RED_TEAM]]));
    expect(Tvt.match).toMatchObject({ active: true, blueScore: 7, redScore: 300, secondsRemaining: 540, ownTeam: RED_TEAM });
    expect(tvtTeamOf(0x1234, false)).toBe(BLUE_TEAM);
    expect(tvtTeamOf(0x0099, true)).toBe(RED_TEAM);
    expect(tvtTeamOf(0x0099, false)).toBeNull();
    expect(tvtSecondsLeft(Tvt.receivedAtMs + 40_500)).toBe(500);
  });

  it('opens the window on the Battle Master instead of talking, and joins only while registration is open', () => {
    const talk = vi.spyOn(Merchant, 'talkToNpc').mockImplementation(() => {});
    const npc = { netId: 0x55, name: 'Battle Master', npcType: 765 };
    expect(takeNpcClick(npc)).toBe(true);
    expect(MuWindows.isOpen(TVT_WINDOW)).toBe(true);

    joinTvt();
    expect(talk).not.toHaveBeenCalled();

    EventBus.emit('TvtRegistration', registration(true));
    expect(Tvt.registrationOpen).toBe(true);
    joinTvt();
    expect(talk).toHaveBeenCalledWith(npc);
    expect(MuWindows.isOpen(TVT_WINDOW)).toBe(false);
    talk.mockRestore();
  });
});
