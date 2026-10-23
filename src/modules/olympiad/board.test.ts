import { describe, expect, it } from 'vitest';
import { HERO, holdsRewardWeapon, pageCount, readDeathRecords, readOlympiadBoard, watchMatchesPerPage, winRatePercent } from './board';

/** Bytes as OlympiadViewPlugIn.ShowBoardAsync writes them (S GameServer/RemoteView/Olympiad). */
function boardBytes(): Uint8Array {
  const name = (s: string) => [...Array.from(s, c => c.charCodeAt(0)), ...new Array(11 - s.length).fill(0)];
  const u16 = (n: number) => [n & 0xff, n >> 8];
  const i32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
  const status = [
    0b1001, // open, battles on another server
    2, // Hero
    3, // class
    ...i32(120),
    4, 15, // today, per day
    ...u16(11), ...u16(7), ...u16(3), ...u16(1), ...u16(2),
    10, // minimum matches for Hero
    ...i32(55), ...i32(9),
    ...u16(400), ...u16(5),
    ...i32(3600), ...i32(7200),
    2, // battle server
    0, 0,
  ];
  expect(status).toHaveLength(43);
  const body = [
    0xee, 0x01, ...status,
    2, 12, ...u16(5), 1, 0, 0, ...u16(9), 0, 1, // rewards: wings, a held weapon
    1, ...name('Hero'), 2, ...i32(300), ...u16(20), ...u16(15), 3, 1,
    1, 4, ...name('Alpha'), 0, ...name('Beta'), 1,
    1, 14, ...u16(13), 0, ...i32(40), 1,
  ];
  const length = 3 + body.length;
  return new Uint8Array([0xc2, length >> 8, length & 0xff, ...body]);
}

describe('olympiad board (C2 EE 01)', () => {
  it('reads the status and the four lists', () => {
    const bytes = boardBytes();
    const board = readOlympiadBoard(new DataView(bytes.buffer));
    if (!board) throw new Error('board not read');
    expect(board).toMatchObject({
      isOpen: true,
      isQueued: false,
      heroState: HERO,
      classIndex: 3,
      points: 120,
      matchesToday: 4,
      maximumPerDay: 15,
      weekMatches: 11,
      wins: 7,
      losses: 3,
      draws: 1,
      rank: 2,
      minimumMatchesForHero: 10,
      tokens: 55,
      claimableTokens: 9,
      minimumLevel: 400,
      minimumResets: 5,
      heroSecondsLeft: 3600,
      secondsToNextWindow: 7200,
      battleServer: 2,
    });
    expect(board.rewards).toEqual([
      { group: 12, number: 5, isWing: true, isHeld: false },
      { group: 0, number: 9, isWing: false, isHeld: true },
    ]);
    expect(board.heroes[0]).toEqual({ name: 'Hero', classIndex: 2, points: 300, matches: 20, wins: 15, timesHero: 3, certified: true });
    expect(board.matches[0]).toEqual({ room: 4, first: 'Alpha', firstClass: 0, second: 'Beta', secondClass: 1 });
    expect(board.shop[0]).toEqual({ group: 14, number: 13, level: 0, price: 40, category: 1 });
    expect(holdsRewardWeapon(board)).toBe(true);
  });

  it('stops at a list the packet cuts short and refuses a short status', () => {
    const bytes = boardBytes();
    const cut = bytes.slice(0, 5 + 43 + 1 + 5 + 2);
    cut[1] = 0;
    cut[2] = cut.length;
    const board = readOlympiadBoard(new DataView(cut.buffer));
    if (!board) throw new Error('board not read');
    expect(board.rewards).toHaveLength(1);
    expect(board.heroes).toHaveLength(0);
    expect(readOlympiadBoard(new DataView(bytes.slice(0, 40).buffer))).toBeNull();
  });

  it('pages and rates like ReforgeOlympiad.cpp', () => {
    expect(watchMatchesPerPage(6)).toBe(6);
    expect(watchMatchesPerPage(7)).toBe(5);
    expect(pageCount(0, 5)).toBe(1);
    expect(pageCount(11, 5)).toBe(3);
    expect(winRatePercent(2, 3)).toBe(66);
    expect(winRatePercent(1, 0)).toBe(0);
  });
});

describe('death records (C2 E0 01)', () => {
  it('reads the 130-byte records of DeathRecordsViewPlugIn', () => {
    const record = new Uint8Array(130);
    record.set(Array.from('Killer', c => c.charCodeAt(0)), 0);
    record.set(Array.from('Guild', c => c.charCodeAt(0)), 28);
    record.set(Array.from('Lorencia', c => c.charCodeAt(0)), 56);
    record.set([5, 0, 2, 0, 0xea, 0x07, 10, 21, 13, 45], 88);
    record[98] = 0x12;
    const length = 6 + 130;
    const bytes = new Uint8Array([0xc2, 0, length, 0xe0, 0x01, 1, ...record]);
    const [r] = readDeathRecords(new DataView(bytes.buffer));
    expect(r).toMatchObject({ killer: 'Killer', guild: 'Guild', location: 'Lorencia', deaths: 5, kills: 2 });
    expect(new Date(r.when).toISOString()).toBe('2026-10-21T13:45:00.000Z');
    expect(r.guildMark?.slice(0, 2)).toEqual([1, 2]);
  });

  it('leaves the mark out for an all-zero logo and stops at the bytes there are', () => {
    const bytes = new Uint8Array([0xc2, 0, 6 + 130, 0xe0, 0x01, 3, ...new Uint8Array(130)]);
    const records = readDeathRecords(new DataView(bytes.buffer));
    expect(records).toHaveLength(1);
    expect(records[0].guildMark).toBeNull();
  });
});
