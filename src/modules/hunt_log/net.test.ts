import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { installNet } = await import('./net');
const { HuntLog, NOT_ESTIMABLE, buildHuntLogRequest, closeHuntLog, helperStopped, huntLogShown } = await import('./state');

installNet();

/** S HuntLogViewPlugIn.ShowHuntLogAsync: 80 bytes, little endian. */
function frame(): DataView {
  const v = new DataView(new ArrayBuffer(80));
  [0xc1, 80, 0xda, 0x01, 1].forEach((b, i) => v.setUint8(i, b));
  v.setUint32(5, 3725, true);
  v.setBigUint64(9, 1_234_567n, true);
  v.setBigUint64(17, 50_000n, true);
  v.setBigUint64(25, 1_200n, true);
  v.setUint32(33, 3, true);
  v.setBigUint64(37, 9_000_000n, true);
  v.setBigUint64(45, 13_500_000n, true);
  v.setBigUint64(53, 4_321n, true);
  v.setBigUint64(61, 4_400n, true);
  v.setUint32(69, 600, true);
  v.setUint16(73, 251, true);
  v.setUint32(75, NOT_ESTIMABLE, true);
  v.setUint8(79, 1);
  return v;
}

describe('Hunt log (C1 DA 01)', () => {
  it('reads the 80-byte figures', () => {
    EventBus.emit('HuntLogInfo', frame());
    expect(HuntLog.statistics).toEqual({
      active: true,
      elapsedSeconds: 3725,
      damagePerMinute: 1_234_567,
      zenPerMinute: 50_000,
      lastZen: 1_200,
      levelUps: 3,
      experiencePerMinuteNoVip: 9_000_000,
      experiencePerMinuteWithVip: 13_500_000,
      averageExperiencePerMonster: 4_321,
      lastExperience: 4_400,
      secondsToNextLevel: 600,
      nextLevel: 251,
      secondsToMaxLevel: NOT_ESTIMABLE,
      resetAvailable: true,
    });
  });

  it('asks with [C1][04][DA][01]', () => {
    expect([...new Uint8Array(buildHuntLogRequest().buffer)]).toEqual([0xc1, 0x04, 0xda, 0x01]);
  });

  it('shows while the MU Helper runs, until its X closes it for that run', () => {
    expect(huntLogShown(false)).toBe(false);
    expect(huntLogShown(true)).toBe(true);
    closeHuntLog(true);
    expect(huntLogShown(true)).toBe(false);
    helperStopped();
    expect(huntLogShown(true)).toBe(true);
  });
});
