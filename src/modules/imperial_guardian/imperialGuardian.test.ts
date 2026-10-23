import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const P = await import('@versions/reforge/packets/ServerToClientPackets');
const { installNet } = await import('./net');
const { ImperialGuardian, PHASE_BATTLE } = await import('./state');

installNet();

/** C1 F7 02 / 04 / 06 built with the generated writers of our server's XML. */
describe('the Imperial Guardian timer (C1 F7)', () => {
  it('keeps round and zone on entering, shows the timer from F7 04 and hides it on a result', () => {
    const enter = P.ImperialGuardianEnterResultPacket.createPacket();
    enter.Result = P.ImperialGuardianEnterResultEnterResultEnum.Success;
    enter.Round = 3;
    enter.Zone = 2;
    enter.RemainingTimeMilliseconds = 90000;
    EventBus.emit('ImperialGuardianEnterResult', enter.buffer);
    expect([ImperialGuardian.round, ImperialGuardian.zone, ImperialGuardian.open]).toEqual([3, 2, false]);

    const tick = P.ImperialGuardianRemainingTimePacket.createPacket();
    tick.Phase = P.ImperialGuardianRemainingTimePhaseTypeEnum.Battle;
    tick.RemainingTimeMilliseconds = 60000;
    tick.MonsterCount = 17;
    EventBus.emit('ImperialGuardianRemainingTime', tick.buffer);
    expect(ImperialGuardian.open).toBe(true);
    expect(ImperialGuardian.phase).toBe(PHASE_BATTLE);
    expect(ImperialGuardian.monsterCount).toBe(17);
    expect(ImperialGuardian.msLeft(ImperialGuardian.remainAt + 1000)).toBe(59000);

    const clear = P.ImperialGuardianClearResultPacket.createPacket();
    clear.Result = P.ImperialGuardianClearResultClearResultEnum.ZoneCleared;
    EventBus.emit('ImperialGuardianClearResult', clear.buffer);
    expect(ImperialGuardian.open).toBe(false);
    expect(ImperialGuardian.box).toEqual({ kind: 'zoneCleared', round: 3, zone: 2 });
  });

  it('says why an entry was refused, the delay in whole minutes', () => {
    const enter = P.ImperialGuardianEnterResultPacket.createPacket();
    enter.Result = P.ImperialGuardianEnterResultEnterResultEnum.TimeRemaining;
    enter.RemainingTimeMilliseconds = 5 * 60000 + 30000;
    EventBus.emit('ImperialGuardianEnterResult', enter.buffer);
    expect(ImperialGuardian.box).toEqual({ kind: 'entryDelay', minutes: 5 });
    enter.Result = P.ImperialGuardianEnterResultEnterResultEnum.PartyRequired;
    EventBus.emit('ImperialGuardianEnterResult', enter.buffer);
    expect(ImperialGuardian.box).toEqual({ kind: 'partyRequired' });
  });
});
