import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { MuWindows } = await import('@/controllers/interface/windowManager');
const { Session } = await import('../session');
const { takeNpcClick } = await import('../npc_shop');
const { installNet, QUEST_BOARD_WINDOW, acceptQuest, claimQuest } = await import('./net');
const S = await import('./state');

installNet();

type Entry = { number: number; state: number; monster: number; required: number; current: number; name: number[]; reward: string };

/** S QuestBoardViewPlugIn.SendEntriesAsync: `[C2][len BE][DF][sub][count]`, 100 bytes a quest. */
function board(sub: number, entries: Entry[]): DataView {
  const length = 6 + entries.length * 100;
  const v = new DataView(new ArrayBuffer(length));
  [0xc2, length >> 8, length & 0xff, 0xdf, sub, entries.length].forEach((b, i) => v.setUint8(i, b));
  entries.forEach((e, i) => {
    const o = 6 + i * 100;
    v.setUint8(o, e.number);
    v.setUint8(o + 1, e.state);
    v.setUint16(o + 2, e.monster, true);
    v.setUint16(o + 4, e.required, true);
    v.setUint16(o + 6, e.current, true);
    e.name.forEach((b, j) => v.setUint8(o + 8 + j, b));
    [...new TextEncoder().encode(e.reward)].forEach((b, j) => v.setUint8(o + 36 + j, b));
  });
  return v;
}
const ascii = (s: string) => [...new TextEncoder().encode(s)];
const DONE: Entry = { number: 1, state: 3, monster: 3, required: 10, current: 10, name: ascii('Spiders'), reward: '10,000 Zen' };
const ACTIVE: Entry = { number: 2, state: 2, monster: 4, required: 300, current: 120, name: ascii('Budge Dragons'), reward: '1.2M Zen + 30 Points + 3x Bless' };
const LOCKED: Entry = { number: 3, state: 0, monster: 7, required: 50, current: 0, name: ascii('Giants'), reward: 'Gold Medal' };

describe('the quest board (C2 DF)', () => {
  it('reads the server layout', () => {
    const quests = S.parseQuestBoard(board(1, [DONE, ACTIVE, LOCKED])) ?? [];
    expect(quests).toHaveLength(3);
    expect(quests[1]).toEqual({ number: 2, state: 2, monsterNumber: 4, requiredKills: 300, currentKills: 120, name: 'Budge Dragons', reward: '1.2M Zen + 30 Points + 3x Bless' });
    expect(S.currentQuest(quests)).toBe(1);
    expect([S.canAccept(quests[1]), S.canClaim(quests[1]), S.progress(quests[1])]).toEqual([false, false, 0.4]);
  });

  it('drops a UTF-8 character the 28-byte field cut in two, and a quest past the frame', () => {
    const cut = [...ascii('x'.repeat(25)), 0xd0, 0x9f, 0xd0];
    const quests = S.parseQuestBoard(board(1, [{ ...DONE, name: cut }])) ?? [];
    expect(quests[0]?.name).toBe(`${'x'.repeat(25)}П`);
    const short = board(1, [DONE, ACTIVE]);
    expect(S.parseQuestBoard(new DataView(short.buffer, 0, 150))).toHaveLength(1);
    expect(S.parseQuestBoard(new DataView(Uint8Array.from([0xc1, 4, 0xdf, 1]).buffer))).toBeNull();
  });

  it('builds the requests our C++ client sends', () => {
    const bytes = (v: DataView) => [...new Uint8Array(v.buffer)];
    expect(bytes(S.buildAcceptRequest(3))).toEqual([0xc1, 0x05, 0xdf, 0x02, 3]);
    expect(bytes(S.buildClaimRequest())).toEqual([0xc1, 0x04, 0xdf, 0x03]);
    expect(bytes(S.buildBoardRequest())).toEqual([0xc1, 0x04, 0xdf, 0x01]);
    expect(bytes(S.buildActiveRequest())).toEqual([0xc1, 0x04, 0xdf, 0x04]);
  });

  it('asks for the board on a click on Captain Slough, opens on DF 01, accepts and claims', () => {
    runInAction(() => (Session.isOffline = false));
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
    const sent = () => send.mock.calls.map(([v]) => [...new Uint8Array((v as DataView).buffer)]);
    expect(takeNpcClick({ netId: 7, name: 'Captain Slough', npcType: 763 })).toBe(true);
    expect(sent()).toEqual([[0xc1, 0x04, 0xdf, 0x01]]);

    send.mockClear();
    EventBus.emit('QuestBoardList', board(1, [DONE, { ...ACTIVE, state: 1, current: 0 }, LOCKED]));
    expect(MuWindows.isOpen(QUEST_BOARD_WINDOW)).toBe(true);
    expect(sent()).toEqual([[0xc1, 0x04, 0xdf, 0x04]]);
    acceptQuest();
    claimQuest();
    expect(sent().slice(1)).toEqual([[0xc1, 0x05, 0xdf, 0x02, 2]]);

    send.mockClear();
    EventBus.emit('QuestBoardList', board(1, [DONE, { ...ACTIVE, current: 300 }, LOCKED]));
    acceptQuest();
    claimQuest();
    // Every DF 01 (here the refresh after an accept) asks for the active quests again (DF 04, answered by DF 05).
    expect(sent()).toEqual([[0xc1, 0x04, 0xdf, 0x04], [0xc1, 0x04, 0xdf, 0x03]]);

    EventBus.emit('QuestBoardActiveList', board(5, [ACTIVE]));
    expect(S.QuestBoard.active.map(q => q.name)).toEqual(['Budge Dragons']);
    send.mockRestore();
  });
});
