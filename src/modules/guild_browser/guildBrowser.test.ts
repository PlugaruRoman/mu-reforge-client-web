import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { MuWindows } = await import('@/controllers/interface/windowManager');
const { GuildMemberRoleEnum } = await import('@versions/shared/packets/ServerToClientPackets');
const { GuildRelationshipTypeEnum } = await import('@versions/shared/packets/ClientToServerPackets');
const { Session } = await import('../session');
const { Hero } = await import('../hero');
const { Social } = await import('../social/social');
const N = await import('./net');
const S = await import('./state');

N.installNet();

const utf8 = (s: string) => [...new TextEncoder().encode(s)];
const field = (s: string | number[], length: number) => {
  const bytes = typeof s === 'string' ? utf8(s) : s;
  return [...bytes, ...new Array<number>(length - bytes.length).fill(0)];
};

type Entry = { name: string | number[]; online: number; flags: number; score: number; other?: string; mark?: number[] };

/** S OnlineGuildEntry: name[9], online, flags, score u32 LE, other[9], mark[32]. */
const entry = (e: Entry) => [
  ...field(e.name, 9),
  e.online,
  e.flags,
  e.score & 0xff,
  (e.score >> 8) & 0xff,
  (e.score >> 16) & 0xff,
  e.score >>> 24,
  ...field(e.other ?? '', 9),
  ...(e.mark ?? new Array<number>(32).fill(0)),
];

const c2 = (sub: number, header: number[], entries: Entry[]) => {
  const body = [0xdc, sub, ...header, entries.length, ...entries.flatMap(entry)];
  const length = body.length + 3;
  return new DataView(Uint8Array.from([0xc2, length >> 8, length & 0xff, ...body]).buffer);
};

/** S GuildWarListViewPlugIn: `[state][warType][own][enemy][max][otherGuild:9][count]`. */
const warList = (state: number, other: string, entries: Entry[], scores = [0, 0, 0], soccer = 0) =>
  c2(0x10, [state, soccer, ...scores, ...field(other, 9)], entries);
/** S GuildAllianceListViewPlugIn: `[state][isAllianceMaster][size][otherGuild:9][count]`. */
const allianceList = (state: number, master: boolean, size: number, other: string, entries: Entry[]) =>
  c2(0x12, [state, master ? 1 : 0, size, ...field(other, 9)], entries);

const MARK = Array.from({ length: 32 }, (_, i) => (i * 17) & 0xff);
const FREE: Entry = { name: 'Lions', online: 5, flags: 1, score: 70000, mark: MARK };
const BUSY: Entry = { name: 'Wolves', online: 3, flags: 3, score: 12, other: 'Bears' };
const ALLY: Entry = { name: 'Eagles', online: 2, flags: 5, score: 1 };
const OFFLINE: Entry = { name: 'Крыс', online: 1, flags: 0, score: 0 };

const bytes = (v: DataView) => [...new Uint8Array(v.buffer, v.byteOffset, v.byteLength)];

describe('the guild browser lists (C2 DC 10 / DC 12)', () => {
  it('reads the war list as the server writes it', () => {
    const list = S.parseWarList(warList(3, 'Bears', [FREE, BUSY, ALLY, OFFLINE], [4, 7, 20], 1));
    expect(list).toMatchObject({ state: S.WarState.atWar, soccer: true, ownScore: 4, enemyScore: 7, maximumScore: 20, otherGuild: 'Bears' });
    expect(list?.guilds).toHaveLength(4);
    expect(list?.guilds[0]).toEqual({ name: 'Lions', onlineMembers: 5, score: 70000, masterOnline: true, busy: false, ally: false, otherGuild: '', mark: MARK });
    expect(list?.guilds[1]).toMatchObject({ busy: true, masterOnline: true, otherGuild: 'Bears' });
    expect(list?.guilds[2]).toMatchObject({ ally: true, busy: false });
    expect(list?.guilds[3]).toMatchObject({ name: 'Крыс', masterOnline: false });
  });

  it('reads the alliance list, whose flags have no ally bit', () => {
    const list = S.parseAllianceList(allianceList(2, true, 3, 'Lions', [FREE, { ...BUSY, flags: 7, other: 'Lions' }]));
    expect(list).toMatchObject({ state: S.AllianceState.inAlliance, isAllianceMaster: true, allianceSize: 3, otherGuild: 'Lions' });
    expect(list?.guilds[1]).toMatchObject({ busy: true, ally: false, otherGuild: 'Lions' });
  });

  it('drops a guild past the frame and a name the 9-byte field cut in two', () => {
    const cut = [...utf8('Волк'), 0xd0];
    const list = S.parseWarList(warList(0, '', [{ ...FREE, name: cut }, BUSY]));
    expect(list?.guilds[0].name).toBe('Волк');
    const full = warList(0, '', [FREE, BUSY]);
    expect(S.parseWarList(new DataView(full.buffer, 0, 20 + 56 + 30))?.guilds).toHaveLength(1);
    expect(S.parseWarList(new DataView(Uint8Array.from([0xc1, 4, 0xdc, 0x10]).buffer))).toBeNull();
  });

  it('reads DC 11, the alliance request by guild name', () => {
    expect(S.parseAllianceRequest(new DataView(Uint8Array.from([0xc1, 13, 0xdc, 0x11, ...field('Lions', 9)]).buffer))).toBe('Lions');
    expect(S.parseAllianceRequest(new DataView(Uint8Array.from([0xc1, 5, 0xdc, 0x11, 0]).buffer))).toBeNull();
  });
});

describe('the requests our C++ client sends', () => {
  it('builds the list requests and the alliance request by name', () => {
    expect(bytes(S.buildWarListRequest())).toEqual([0xc1, 4, 0xdc, 0x10]);
    expect(bytes(S.buildAllianceListRequest())).toEqual([0xc1, 4, 0xdc, 0x12]);
    expect(bytes(S.buildAllianceRequest('Lions'))).toEqual([0xc1, 12, 0xdc, 0x11, ...field('Lions', 8)]);
    // Eight bytes hold four Cyrillic letters; the fifth is not cut in two.
    expect(bytes(S.buildAllianceRequest('Волки'))).toEqual([0xc1, 12, 0xdc, 0x11, ...utf8('Волк')]);
  });

  it('sends the war commands as UTF-8 chat lines', () => {
    expect(bytes(S.buildChatCommand('Hero', '/war Крысы'))).toEqual([0xc1, 13 + 15, 0x00, ...field('Hero', 10), ...utf8('/war Крысы')]);
  });
});

describe('the rules (ReforgeGuildBrowser.cpp)', () => {
  const guilds = S.parseWarList(warList(0, '', [FREE, BUSY, ALLY, OFFLINE])) ?? S.emptyWarList();

  it('lets an idle master declare on a free guild whose master is online', () => {
    expect(guilds.guilds.map(g => S.canDeclareOn(guilds, g, true))).toEqual([true, false, false, false]);
    expect(S.canDeclareOn(guilds, guilds.guilds[0], false)).toBe(false);
    expect(S.canDeclare({ ...guilds, state: S.WarState.sent }, true)).toBe(false);
    expect([S.canStop(guilds, true), S.canStop({ ...guilds, state: S.WarState.incoming }, true)]).toEqual([false, true]);
  });

  it('lets the master invite with no alliance or as its leader', () => {
    const none = S.emptyAllianceList();
    expect(S.canInvite(none, true)).toBe(true);
    expect(S.canInvite({ ...none, state: S.AllianceState.inAlliance }, true)).toBe(false);
    expect(S.canInvite({ ...none, state: S.AllianceState.inAlliance, isAllianceMaster: true }, true)).toBe(true);
    expect(S.canInviteTo(none, { ...guilds.guilds[0], busy: true }, true)).toBe(false);
  });

  it('filters by name ignoring case and offers a typed name nothing matches', () => {
    expect(S.matchesFilter('Крыс', 'кры')).toBe(true);
    expect(S.matchesFilter('Lions', 'ON')).toBe(true);
    expect(S.matchesNoGuild(guilds.guilds, 'lio')).toBe(false);
    expect(S.matchesNoGuild(guilds.guilds, 'Tigers')).toBe(true);
    expect(S.matchesNoGuild(guilds.guilds, '')).toBe(false);
  });
});

describe('the actions', () => {
  let sent: number[][] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    vi.spyOn(Session, 'sendToGS').mockImplementation(v => void sent.push(bytes(v as DataView)));
    runInAction(() => {
      Session.isOffline = false;
      Hero.name = 'Hero';
      Social.myGuild = { id: 1, role: GuildMemberRoleEnum.GuildMaster };
      Social.guildRelationRequest = null;
      Social.guildWarRequest = null;
    });
  });

  afterEach(() => {
    runInAction(() => {
      MuWindows.setOpen(N.GUILD_WARS_WINDOW, false);
      MuWindows.setOpen(N.GUILD_ALLIANCE_WINDOW, false);
    });
    EventBus.emit('wsClosed', { socket: {} as WebSocket });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('asks for the list on open, then again every 15 s while open', () => {
    runInAction(() => MuWindows.setOpen(N.GUILD_WARS_WINDOW, true));
    expect(sent).toEqual([[0xc1, 4, 0xdc, 0x10]]);
    vi.advanceTimersByTime(N.AUTO_REFRESH_MS);
    expect(sent).toHaveLength(2);
    runInAction(() => MuWindows.setOpen(N.GUILD_WARS_WINDOW, false));
    vi.advanceTimersByTime(N.AUTO_REFRESH_MS * 2);
    expect(sent).toHaveLength(2);
  });

  it('declares war on a row with /war, waits at once and asks again soon', () => {
    runInAction(() => MuWindows.setOpen(N.GUILD_WARS_WINDOW, true));
    EventBus.emit('GuildWarList', warList(0, '', [FREE, BUSY]));
    sent = [];
    const [free, busy] = S.GuildBrowser.wars.guilds;
    expect(N.actOnGuild('wars', busy)).toBe(false);
    expect(N.actOnGuild('wars', free)).toBe(true);
    expect(sent).toEqual([bytes(S.buildChatCommand('Hero', '/war Lions'))]);
    expect(S.GuildBrowser.wars).toMatchObject({ state: S.WarState.sent, otherGuild: 'Lions' });
    expect(N.actOnGuild('wars', free)).toBe(false);
    vi.advanceTimersByTime(N.QUICK_REFRESH_MS);
    expect(sent.at(-1)).toEqual([0xc1, 4, 0xdc, 0x10]);
    expect(N.stopWar()).toBe(true);
    expect(sent.at(-1)).toEqual(bytes(S.buildChatCommand('Hero', '/warstop')));
    expect(S.GuildBrowser.wars.state).toBe(S.WarState.none);
  });

  it('refuses everything for a member who is not the master', () => {
    runInAction(() => (Social.myGuild = { id: 1, role: GuildMemberRoleEnum.NormalMember }));
    EventBus.emit('GuildWarList', warList(1, 'Bears', [FREE]));
    expect(N.actOnTyped('wars', 'Tigers')).toBe(false);
    expect(N.answerRequest('wars', true)).toBe(false);
    expect(sent).toEqual([]);
  });

  it('answers an incoming challenge with the stock 0x61 and drops its yes/no box', () => {
    runInAction(() => (Social.guildWarRequest = { guildName: 'Bears', soccer: false }));
    EventBus.emit('GuildWarList', warList(1, 'Bears', []));
    expect(N.answerRequest('wars', true)).toBe(true);
    expect(sent).toEqual([[0xc1, 4, 0x61, 1]]);
    expect(Social.guildWarRequest).toBeNull();
    expect(S.GuildBrowser.wars.state).toBe(S.WarState.none);
  });

  it('invites by row (DC 11) and by a typed name', () => {
    EventBus.emit('GuildAllianceList', allianceList(0, false, 0, '', [FREE]));
    expect(N.actOnGuild('alliance', S.GuildBrowser.alliance.guilds[0])).toBe(true);
    expect(N.actOnTyped('alliance', ' Tigers ')).toBe(true);
    expect(sent).toEqual([bytes(S.buildAllianceRequest('Lions')), bytes(S.buildAllianceRequest('Tigers'))]);
  });

  it('raises the yes/no box for DC 11 and refuses a second request while it is up', () => {
    const request = (name: string) => new DataView(Uint8Array.from([0xc1, 13, 0xdc, 0x11, ...field(name, 9)]).buffer);
    EventBus.emit('GuildAllianceRequestByName', request('Lions'));
    expect(Social.guildRelationRequest).toEqual({ senderId: 0, senderName: 'Lions', relationship: GuildRelationshipTypeEnum.Alliance, join: true });
    EventBus.emit('GuildAllianceRequestByName', request('Bears'));
    expect(sent).toHaveLength(1);
    expect(sent[0].slice(0, 6)).toEqual([0xc1, 8, 0xe6, GuildRelationshipTypeEnum.Alliance, 1, 0]);
    expect(Social.guildRelationRequest?.senderName).toBe('Lions');

    // The banner's Accept answers it and takes the box away.
    EventBus.emit('GuildAllianceList', allianceList(1, false, 0, 'Lions', []));
    expect(N.answerRequest('alliance', true)).toBe(true);
    expect(sent[1].slice(0, 6)).toEqual([0xc1, 8, 0xe6, GuildRelationshipTypeEnum.Alliance, 1, 1]);
    expect(Social.guildRelationRequest).toBeNull();
  });

  it('closes both windows when the hero leaves the guild', () => {
    runInAction(() => MuWindows.setOpen(N.GUILD_ALLIANCE_WINDOW, true));
    runInAction(() => (Social.myGuild = null));
    expect(MuWindows.isOpen(N.GUILD_ALLIANCE_WINDOW)).toBe(false);
  });
});
