import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { loadGameVersion } = await import('@/version');
const { EventBus } = await import('@/core/eventBus');
const { installQuestLog, questProgressOf, questProgressOpen } = await import('./questLog');

installQuestLog();

/**
 * C2 F6 1B / F6 0C at 106.3, 272 bytes (S RemoteView/Quest/QuestStateResponseExtendedPlugIn.cs,
 * QuestProgressExtendedPlugIn.cs, QuestStructExtensions.cs): counts at 5-7, number / group u16 LE at
 * 8 / 10, five 28-byte conditions from 12 (type, id u16, required u32, current u32, 15-byte item
 * at 12) and five 24-byte rewards from 152 (type, id u16, count u32, 15-byte item at 8).
 */
function quest(sub: number, number: number, group: number): DataView {
  const b = new DataView(new ArrayBuffer(272));
  [0xc2, 0x01, 0x10, 0xf6, sub, 1, 2, 0].forEach((v, i) => b.setUint8(i, v));
  b.setUint16(8, number, true);
  b.setUint16(10, group, true);
  // Condition 0: kill 10 of monster 7, 4 done.
  b.setUint8(12, 1);
  b.setUint16(14, 7, true);
  b.setUint32(16, 10, true);
  b.setUint32(20, 4, true);
  // Reward 0: 50000 experience. Reward 1: one item, the 5-byte extended Kris +0 (group 0, number 1).
  b.setUint8(152, 1);
  b.setUint32(156, 50000, true);
  b.setUint8(176, 4);
  b.setUint32(180, 1, true);
  [0x00, 0x01, 0, 20, 0x00].forEach((v, i) => b.setUint8(184 + i, v));
  return b;
}

describe('the quest packets at 106.3', () => {
  beforeAll(() => loadGameVersion('reforge'));
  afterAll(() => loadGameVersion('season6'));

  it('QuestStateExtended caches the conditions and rewards of the quest', () => {
    EventBus.emit('QuestStateExtended', quest(0x1b, 5, 2));
    const progress = questProgressOf((2 << 16) | 5);
    if (!progress) throw new Error('no progress for quest 2/5');
    expect(progress.complete).toBe(false);
    expect(progress.objectives).toMatchObject([{ type: 1, id: 7, required: 10, current: 4 }]);
    expect(progress.lines.filter(l => l.kind === 'reward')).toHaveLength(2);
    expect(questProgressOpen()).toBe(false);
  });

  it('QuestProgressExtended opens the progress window on it', () => {
    EventBus.emit('QuestProgressExtended', quest(0x0c, 6, 2));
    expect(questProgressOf((2 << 16) | 6)).toBeDefined();
    expect(questProgressOpen()).toBe(true);
  });
});
