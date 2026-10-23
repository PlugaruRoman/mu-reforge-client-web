import { afterAll, describe, expect, it, vi } from 'vitest';
import type { World } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Ecs } = await import('@/ecs/current');
const { installNet } = await import('./net');
const { ShowHealthStatusPacket } = await import('@versions/reforge/packets/healthStatus');

installNet();

/** `[C1][07][ED][01][id u16 BE][status]` (S RemoteView/World/ShowHealthStatusPlugIn.cs). */
const frame = (id: number, status: number) => new DataView(Uint8Array.from([0xc1, 7, 0xed, 0x01, id >> 8, id & 0xff, status]).buffer);

const health: Record<string, number> = { maxHealth: 2000, currentHealth: 2000 };
const monster = {
  npcType: 43,
  attributeSystem: {
    hasAttribute: () => true,
    getValue: (k: string) => health[k],
    setValue: (k: string, v: number) => void (health[k] = v),
  },
};
Ecs.world = { getByNetId: (id: number) => (id === 0x12c ? monster : undefined) } as unknown as World;
afterAll(() => {
  Ecs.world = null;
});

describe('ShowHealthStatus (C1 ED 01)', () => {
  it('reads the id big endian and the status', () => {
    const p = new ShowHealthStatusPacket(frame(0x812c, 125));
    expect([p.ObjectId, p.HealthStatus]).toEqual([0x812c, 125]);
  });

  it('sets the watched monster to its share of 250', () => {
    EventBus.emit('ShowHealthStatus', frame(0x812c, 125));
    expect(health.currentHealth).toBe(1000);
  });

  it('leaves the bar alone when the server does not know (0xFF)', () => {
    EventBus.emit('ShowHealthStatus', frame(0x012c, 0xff));
    expect(health.currentHealth).toBe(1000);
  });
});
