import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const P = await import('@versions/reforge/packets/ServerToClientPackets');
const { nameTintOf } = await import('@/controllers/interface/nameTags');
const { matchChatCommands } = await import('../chat/chatCommands');
const { Economy } = await import('../economy/economy');
const { installNet, readPartyMemberBuffs } = await import('./net');
const { ReforgeHud, fitUtf8, pvpFlagColour } = await import('./state');

installNet();

describe('the Mu Reforge HUD frames', () => {
  it('reads each member\'s buffs of D8 04 (PartyMemberBuffsViewPlugIn)', () => {
    const bytes = new Uint8Array([0xc2, 0, 12, 0xd8, 0x04, 3, 2, 1, 8, 0, 1, 103]);
    expect(readPartyMemberBuffs(new DataView(bytes.buffer))).toEqual([[1, 8], [], [103]]);
    // A member cut short ends the list.
    expect(readPartyMemberBuffs(new DataView(bytes.slice(0, 8).buffer))).toEqual([]);
  });

  it('tints a flagged name violet and blinks it over the last 5 s (EA)', () => {
    const p = P.PvpFlagStatePacket.createPacket();
    p.PlayerId = 0x8123;
    p.RemainingSeconds = 30;
    EventBus.emit('PvpFlagState', p.buffer);
    expect(nameTintOf(0x0123)).toBe('rgb(170, 85, 240)');
    expect(nameTintOf(0x0124)).toBeNull();
    expect(pvpFlagColour(4000, 1200)).toBe('rgb(170, 85, 240)');
    expect(pvpFlagColour(4000, 1500)).toBe('rgb(255, 255, 255)');
    expect(pvpFlagColour(9000, 1500)).toBe('rgb(170, 85, 240)');
  });

  it('keeps the server\'s mix rate and clears it on mix 0 (EC)', () => {
    const p = P.ChaosMachineMixRatePacket.createPacket();
    p.MixType = 7;
    p.SuccessRate = 45;
    p.Price = 2_000_000;
    EventBus.emit('ChaosMachineMixRate', p.buffer);
    expect(Economy.serverMixRate).toEqual({ mixId: 7, rate: 45, zen: 2_000_000 });
    p.MixType = 0;
    EventBus.emit('ChaosMachineMixRate', p.buffer);
    expect(Economy.serverMixRate).toBeNull();
  });

  it('adds the server\'s chat commands to the completion (F5 01)', () => {
    const p = P.AvailableChatCommandPacket.createPacket(345);
    p.setCommand('/olympiad');
    p.setName('Olympiad');
    p.setDescription('Olympiad standing.');
    EventBus.emit('AvailableChatCommand', p.buffer);
    expect(matchChatCommands('/olym', false)).toEqual([
      expect.objectContaining({ name: '/olympiad', help: 'Olympiad standing.', gm: false }),
    ]);
  });

  it('marks a guest login and cuts a session name at a UTF-8 character (D0)', () => {
    const p = P.GuestAccessStatusPacket.createPacket();
    p.IsGuestSession = true;
    EventBus.emit('GuestAccessStatus', p.buffer);
    expect(ReforgeHud.isGuest).toBe(true);
    expect([...fitUtf8('aé', 2)]).toEqual([0x61]);
    expect([...fitUtf8('abc', 2)]).toEqual([0x61, 0x62]);
  });
});
