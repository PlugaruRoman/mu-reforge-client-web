import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { installBloodCastle, bloodCastleScore } = await import('./bloodCastle');

installBloodCastle();

/**
 * The 29-byte C1 93 both castles end with: success at 3, type at 4, name 10 at 5, then three
 * u32 LE at 17 / 21 / 25 (S ServerToClientPackets.xml BloodCastleScore / ChaosCastleScore).
 */
function score(type: number, a: number, b: number, c: number): DataView {
  const bytes = new DataView(new ArrayBuffer(29));
  [0xc1, 29, 0x93, 1, type].forEach((v, i) => bytes.setUint8(i, v));
  Array.from('Roman', ch => ch.charCodeAt(0)).forEach((v, i) => bytes.setUint8(5 + i, v));
  bytes.setUint32(17, a, true);
  bytes.setUint32(21, b, true);
  bytes.setUint32(25, c, true);
  return bytes;
}

describe('C1 93: Blood Castle or Chaos Castle by the type byte', () => {
  it('reads 0xFE as our Chaos Castle result: monster kills, exp, player kills', () => {
    // ChaosCastleScoreTableViewPlugin.cs: SendChaosCastleScoreAsync(success, name, monsterKills, bonusExp, playerKills).
    EventBus.emit('BloodCastleScore', score(0xfe, 37, 125000, 4));
    expect(bloodCastleScore()).toMatchObject({ success: true, name: 'Roman', exp: 125000, kills: { monsters: 37, players: 4 } });
  });

  it('keeps 0xFF as the Blood Castle score: score, exp, zen', () => {
    EventBus.emit('BloodCastleScore', score(0xff, 1200, 50000, 30000));
    const read = bloodCastleScore();
    if (!read) throw new Error('no Blood Castle score');
    expect(read).toMatchObject({ score: 1200, exp: 50000, zen: 30000 });
    expect(read.kills).toBeUndefined();
  });
});
