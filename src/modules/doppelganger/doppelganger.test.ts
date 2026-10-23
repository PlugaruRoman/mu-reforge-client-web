import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const P = await import('@versions/reforge/packets/ServerToClientPackets');
const { doppelgangerWindow, openDoppelganger } = await import('../events/doppelganger');
const { installNet } = await import('./net');
const { Doppelganger, approach } = await import('./state');

installNet();

/** C1 BF xx frames built with the generated writers of our server's XML (S ServerToClientPackets.xml). */
describe('the Doppelganger frame (C1 BF 0E-14)', () => {
  it('opens on Playing, follows the packets and shows the result', () => {
    const state = P.DoppelgangerStateUpdatePacket.createPacket();
    state.State = P.DoppelgangerStateUpdateDoppelgangerStateEnum.Playing;
    EventBus.emit('DoppelgangerStateUpdate', state.buffer);
    expect(Doppelganger.frameOpen).toBe(true);
    expect(Doppelganger.box).toBe('rules');

    const position = P.DoppelgangerMonsterPositionPacket.createPacket();
    position.Position = 11;
    EventBus.emit('DoppelgangerMonsterPosition', position.buffer);
    expect(Doppelganger.monsterTarget).toBeCloseTo(0.5);

    const goal = P.DoppelgangerMonsterGoalPacket.createPacket();
    goal.MaximumGoalCount = 3;
    goal.GoalCount = 1;
    EventBus.emit('DoppelgangerMonsterGoal', goal.buffer);
    expect([Doppelganger.maxMonsters, Doppelganger.enteredMonsters]).toEqual([3, 1]);

    const ice = P.DoppelgangerIceWalkerStatePacket.createPacket();
    ice.State = P.DoppelgangerIceWalkerStateIceWalkerStateEnum.Appeared;
    ice.Position = 22;
    EventBus.emit('DoppelgangerIceWalkerState', ice.buffer);
    expect(Doppelganger.iceWalker).toBe(true);
    expect(Doppelganger.iceWalkerPosition).toBe(0);

    const result = P.DoppelgangerResultPacket.createPacket();
    result.Result = P.DoppelgangerResultResultTypeEnum.MonstersReachedMagicCircle;
    EventBus.emit('DoppelgangerResult', result.buffer);
    expect(Doppelganger.box).toBe('escaped');
    expect(Doppelganger.timerStopped).toBe(true);
  });

  it('reads the party positions of the play info (path step 22 is the start)', () => {
    const bytes = new Uint8Array([0xc1, 16, 0xbf, 0x12, 0x2c, 0x01, 2, 0, 0x34, 0x12, 65, 22, 0x10, 0x00, 65, 0]);
    EventBus.emit('DoppelgangerPlayInfo', new DataView(bytes.buffer));
    expect(Doppelganger.remainSeconds).toBe(300);
    expect([...Doppelganger.party.entries()].map(([id, p]) => [id, p.target])).toEqual([
      [0x1234, 0],
      [0x10, 1],
    ]);
  });

  it('locks Lugard\'s Enter button from the entry answer and unlocks it again', () => {
    openDoppelganger();
    const answer = P.DoppelgangerEnterResultPacket.createPacket();
    answer.Result = P.DoppelgangerEnterResultEnterResultEnum.AlreadyStarted;
    EventBus.emit('DoppelgangerEnterResult', answer.buffer);
    expect(doppelgangerWindow().locked).toBe(true);
    answer.Result = P.DoppelgangerEnterResultEnterResultEnum.EntranceAvailable;
    EventBus.emit('DoppelgangerEnterResult', answer.buffer);
    expect(doppelgangerWindow().locked).toBe(false);
  });

  it('moves a gauge by at most a step toward its target', () => {
    expect(approach(0, 1, 0.25)).toBe(0.25);
    expect(approach(1, 0, 0.25)).toBe(0.75);
    expect(approach(0.5, 0.6, 0.25)).toBe(0.6);
  });
});
