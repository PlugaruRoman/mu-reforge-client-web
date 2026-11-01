import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Session } = await import('@/modules/session');
const { Social } = await import('../social/social');
const { Hero } = await import('@/modules/hero');
const { MuWindows } = await import('@/controllers/interface/windowManager');
const { installNet } = await import('./net');
const S = await import('./state');
const { PartySearch, PartySearchTab, JoinResult, PARTY_SEARCH_WINDOW } = S;

installNet();
const sent: number[][] = [];
vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push([...new Uint8Array(b.buffer)]));

const ascii = (text: string, length: number) => Array.from({ length }, (_, i) => (i < text.length ? text.charCodeAt(i) : 0));
const frame = (bytes: number[]) => new DataView(Uint8Array.from(bytes).buffer);

/** C1 14 D8 01 as S PartySearchViewPlugIn.ShowSearchStatusAsync writes it. */
const status = (result: number, active: number, maxLevel: number, mask: number, flags: number, password = '') =>
  frame([0xc1, 20, 0xd8, 0x01, result, active, maxLevel & 0xff, maxLevel >> 8, mask, flags, ...ascii(password, 10)]);

/** C2 D8 02 as `ShowOpenPartiesAsync` writes it. */
function list(entries: [string, number, number, number, number, number, number][], count = entries.length): DataView {
  const body = entries.flatMap(([name, map, x, y, members, max, locked]) => [...ascii(name, 10), map, x, y, members, max, locked]);
  const length = 6 + body.length;
  return frame([0xc2, length >> 8, length & 0xff, 0xd8, 0x02, count, ...body]);
}

const members = (...names: string[]) =>
  names.map((name, index) => ({ name, index, mapId: 0, x: 0, y: 0, currentHealth: 1, maximumHealth: 1, healthStep: -1 }));

beforeEach(() => {
  sent.length = 0;
  PartySearch.reset();
  MuWindows.setOpen(PARTY_SEARCH_WINDOW, false);
  runInAction(() => {
    Hero.name = 'Hero';
    Social.partyMembers = [];
  });
});

describe('party search packets (D8)', () => {
  it('reads the status (D8 01): listing, flags, password; auto accept apart', () => {
    EventBus.emit('PartySearchStatus', status(0, 1, 250, 0x05, 0x01 | 0x04 | 0x08, 'pw'));
    expect(PartySearch.listed).toBe(true);
    expect(PartySearch.autoAccept).toBe(true);
    expect(PartySearch.settings).toEqual({ active: true, maxLevel: 250, classMask: 0x05, flags: 0x05, password: 'pw' });
  });

  it('shows a mask of 0 as every class and a maximum level of 0 as the cap', () => {
    EventBus.emit('PartySearchStatus', status(0, 0, 0, 0, 0));
    expect(PartySearch.settings.classMask).toBe(0x7f);
    expect(PartySearch.settings.maxLevel).toBe(400);
  });

  it('keeps the settings of a refused status, but reads its auto accept', () => {
    EventBus.emit('PartySearchStatus', status(1, 1, 100, 1, 0x08));
    expect(PartySearch.autoAccept).toBe(true);
    expect(PartySearch.listed).toBe(false);
    expect(PartySearch.settings.maxLevel).toBe(400);
  });

  it('reads the open list (D8 02), bounded by the frame', () => {
    EventBus.emit('PartySearchList', list([['Master', 2, 120, 30, 3, 5, 0], ['Locked', 0, 1, 2, 5, 5, 1]]));
    expect(PartySearch.parties).toEqual([
      { masterName: 'Master', mapId: 2, x: 120, y: 30, memberCount: 3, maxMembers: 5, hasPassword: false },
      { masterName: 'Locked', mapId: 0, x: 1, y: 2, memberCount: 5, maxMembers: 5, hasPassword: true },
    ]);
    expect(S.isFull(PartySearch.parties[1])).toBe(true);
    EventBus.emit('PartySearchList', list([['Only', 1, 1, 1, 1, 5, 0]], 9));
    expect(PartySearch.parties.map(p => p.masterName)).toEqual(['Only']);
  });

  it('decodes UTF-8 names', () => {
    const name = [...new TextEncoder().encode('Žoltán'), 0, 0].slice(0, 10);
    while (name.length < 10) name.push(0);
    const length = 6 + 16;
    EventBus.emit('PartySearchList', frame([0xc2, 0, length, 0xd8, 0x02, 1, ...name, 0, 0, 0, 1, 5, 0]));
    expect(PartySearch.parties[0].masterName).toBe('Žoltán');
  });

  it('asks for the list on opening a tab (D8 02) and again after 4 s on Find', () => {
    PartySearch.open(PartySearchTab.Find);
    expect(MuWindows.isOpen(PARTY_SEARCH_WINDOW)).toBe(true);
    expect(sent).toEqual([]);
    PartySearch.opened();
    expect(sent).toEqual([[0xc1, 4, 0xd8, 0x02]]);
    const at = PartySearch.lastListRequest;
    PartySearch.poll(at + 3999);
    expect(sent.length).toBe(1);
    PartySearch.poll(at + 4000);
    expect(sent.length).toBe(2);
    PartySearch.selectTab(PartySearchTab.Settings);
    PartySearch.poll(at + 9000);
    expect(sent.length).toBe(3);
  });

  it('joins a row (D8 03 [master:10][password:10])', () => {
    EventBus.emit('PartySearchList', list([['Master', 2, 1, 1, 1, 5, 1]]));
    PartySearch.setJoinPassword('secret');
    expect(PartySearch.join(0)).toBe(true);
    expect(PartySearch.join(1)).toBe(false);
    expect(sent).toEqual([[0xc1, 24, 0xd8, 0x03, ...ascii('Master', 10), ...ascii('secret', 10)]]);
  });

  it('closes on a join that worked and shows a refused one for 6 s (D8 03)', () => {
    PartySearch.open(PartySearchTab.Find);
    PartySearch.opened();
    EventBus.emit('PartySearchJoinResult', frame([0xc1, 5, 0xd8, 0x03, JoinResult.WrongPassword]));
    expect(PartySearch.joinFailure?.result).toBe(JoinResult.WrongPassword);
    const at = PartySearch.joinFailure?.at ?? 0;
    PartySearch.poll(at + 6000);
    expect(PartySearch.joinFailure).toBeNull();
    EventBus.emit('PartySearchJoinResult', frame([0xc1, 5, 0xd8, 0x03, JoinResult.Success]));
    expect(MuWindows.isOpen(PARTY_SEARCH_WINDOW)).toBe(false);
  });

  it('saves the listing (D8 01) without the auto-accept bit and returns to Find', () => {
    PartySearch.open(PartySearchTab.Settings);
    PartySearch.opened();
    sent.length = 0;
    PartySearch.toggleOption('active');
    PartySearch.stepLevel(-3);
    PartySearch.toggleOption('one_class');
    PartySearch.toggleClass(6);
    PartySearch.setListingPassword('abc');
    PartySearch.save();
    expect(sent[0]).toEqual([0xc1, 19, 0xd8, 0x01, 1, 370 & 0xff, 370 >> 8, 0x3f, 0x04, ...ascii('abc', 10)]);
    expect(PartySearch.tab).toBe(PartySearchTab.Find);
    expect(sent[1]).toEqual([0xc1, 4, 0xd8, 0x02]);
  });

  it('keeps edits against a status arriving before Save', () => {
    PartySearch.open(PartySearchTab.Settings);
    PartySearch.opened();
    PartySearch.stepLevel(-1);
    EventBus.emit('PartySearchStatus', status(0, 1, 100, 0x7f, 0));
    expect(PartySearch.settings.maxLevel).toBe(390);
    expect(PartySearch.listed).toBe(true);
  });

  it('sends auto accept on its own (D8 04)', () => {
    PartySearch.toggleOption('auto_accept');
    PartySearch.toggleOption('auto_accept');
    expect(sent).toEqual([
      [0xc1, 5, 0xd8, 0x04, 1],
      [0xc1, 5, 0xd8, 0x04, 0],
    ]);
  });

  it('cuts a long UTF-8 field at a character boundary', () => {
    expect([...S.fixedUtf8('ąąąąąą', 10)]).toEqual([...new TextEncoder().encode('ąąąąą')]);
    expect([...S.fixedUtf8('abcdefghijkl', 10)]).toEqual(ascii('abcdefghij', 10));
    expect([...S.fixedUtf8('aąąąąą', 10)]).toEqual([...new TextEncoder().encode('aąąąą'), 0]);
  });
});

describe('party search rules', () => {
  it('steps the maximum level by 10 inside 10..400', () => {
    expect(S.stepMaxLevel(400, 1)).toBe(400);
    expect(S.stepMaxLevel(20, -5)).toBe(10);
    expect(S.stepMaxLevel(150, 1)).toBe(160);
  });

  it('turns alliance only off with guild only and back', () => {
    expect(S.toggleRestriction(S.ONLY_ALLIANCE_FLAG, S.ONLY_GUILD_FLAG)).toBe(S.ONLY_GUILD_FLAG);
    expect(S.toggleRestriction(S.ONLY_GUILD_FLAG | S.ONLY_ONE_CLASS_FLAG, S.ONLY_ALLIANCE_FLAG)).toBe(
      S.ONLY_ALLIANCE_FLAG | S.ONLY_ONE_CLASS_FLAG
    );
    expect(S.toggleRestriction(S.ONLY_GUILD_FLAG, S.ONLY_GUILD_FLAG)).toBe(0);
  });

  it('counts the classes of a mask; none or all is every class', () => {
    expect(S.countClasses(0x05)).toBe(2);
    expect(S.allowsEveryClass(0)).toBe(true);
    expect(S.allowsEveryClass(0x7f)).toBe(true);
    expect(S.allowsEveryClass(0x3f)).toBe(false);
  });
});

describe('handing the lead (D8 05)', () => {
  it('sends on the second click on the same member within 5 s', () => {
    runInAction(() => {
      Social.partyMembers = members('Hero', 'Ally', 'Other');
    });
    expect(PartySearch.leadOffered).toBe(true);
    expect(PartySearch.giveLead('Ally', 1000)).toBe(false);
    expect(PartySearch.armedName(1000)).toBe('Ally');
    expect(PartySearch.giveLead('Other', 2000)).toBe(false);
    expect(PartySearch.giveLead('Other', 8000)).toBe(false); // the arm ran out: armed again
    expect(PartySearch.giveLead('Other', 9000)).toBe(true);
    expect(PartySearch.armedName(9000)).toBe('');
    expect(sent).toEqual([[0xc1, 14, 0xd8, 0x05, ...ascii('Other', 10)]]);
  });

  it('is not offered to a member who is not the master, nor for the master himself', () => {
    runInAction(() => {
      Social.partyMembers = members('Leader', 'Hero');
    });
    expect(PartySearch.leadOffered).toBe(false);
    expect(PartySearch.masterOnly).toBe(true);
    expect(PartySearch.giveLead('Leader', 0)).toBe(false);
    runInAction(() => {
      Social.partyMembers = members('Hero', 'Ally');
    });
    expect(PartySearch.giveLead('Hero', 0)).toBe(false);
    expect(PartySearch.giveLead('Hero', 1)).toBe(false);
    expect(sent).toEqual([]);
  });
});
