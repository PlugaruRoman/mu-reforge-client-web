import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('../session');
const { installNet } = await import('./net');
const { ItemCollections } = await import('./state');
const { catalogFrame } = await import('./catalogFrame');

installNet();

describe('item_collections listeners', () => {
  it('fills the catalog from ItemCollectionList', () => {
    EventBus.emit('ItemCollectionList', catalogFrame([{ number: 1, category: 1, name: 'Recruit', slots: [[0, 0, 0, 0, 4, 0, 0]], bonuses: [] }]));
    expect(ItemCollections.hasCatalog).toBe(true);
    expect(ItemCollections.collections.map(c => c.name)).toEqual(['Recruit']);
  });

  it('asks for the catalog again after a refusal, not after a success', () => {
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    const answer = (result: number) => new DataView(Uint8Array.from([0xc1, 0x08, 0xfa, 0x02, result, 1, 0, 0]).buffer);
    EventBus.emit('ItemCollectionRegisterResult', answer(0));
    expect(send).not.toHaveBeenCalled();
    EventBus.emit('ItemCollectionRegisterResult', answer(5));
    expect(send).toHaveBeenCalledTimes(1);
    expect([...new Uint8Array(send.mock.calls[0][0].buffer)]).toEqual([0xc1, 0x04, 0xfa, 0x01]);
  });
});
