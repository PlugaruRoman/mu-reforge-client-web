import { readWireString } from '../../core/binaryUtils';

/**
 * The Battle Statue board (C2 EE 01) and the Death Records list (C2 E0 01), read as our server
 * writes them (S GameServer/RemoteView/Olympiad/OlympiadViewPlugIn.cs, DeathRecords/
 * DeathRecordsViewPlugIn.cs) and our client reads them (Network/Reforge/OlympiadPackets.cpp,
 * DeathRecordPackets.cpp): little endian, names UTF-8 NUL padded, each list entry whole or not at all.
 */

const HEADER = 5;
const STATUS = 43;
const NAME = 11;
const SIZES = { reward: 5, hero: 22, match: 25, shop: 9 } as const;
/** `OlympiadViewPlugIn.MaximumEntries`. */
const MAX_ENTRIES = 40;

/** 0 none, 1 a winner of the closed week who may take the status, 2 Hero. */
export const HERO_QUALIFIED = 1;
export const HERO = 2;

/** The Hero's time left when the status has no end (an admin-named Hero). */
export const NO_END = 0xffffffff;

export type RewardOption = { group: number; number: number; isWing: boolean; isHeld: boolean };
export type HeroLine = {
  name: string;
  classIndex: number;
  points: number;
  matches: number;
  wins: number;
  timesHero: number;
  certified: boolean;
};
export type MatchLine = { room: number; first: string; firstClass: number; second: string; secondClass: number };
/** `category` 0 equipment, 1 misc (`OlympiadShopEntry.Category`). */
export type ShopLine = { group: number; number: number; level: number; price: number; category: number };

export type OlympiadBoard = {
  isOpen: boolean;
  isQueued: boolean;
  isInMatch: boolean;
  heroState: number;
  classIndex: number;
  points: number;
  matchesToday: number;
  maximumPerDay: number;
  weekMatches: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
  minimumMatchesForHero: number;
  tokens: number;
  claimableTokens: number;
  minimumLevel: number;
  minimumResets: number;
  heroSecondsLeft: number;
  secondsToNextWindow: number;
  /** The game server of the battles when it is another one (flag bit 3); 0 here. */
  battleServer: number;
  rewards: RewardOption[];
  heroes: HeroLine[];
  matches: MatchLine[];
  shop: ShopLine[];
};

/** `ParseOlympiadBoard`: null when the status does not fit. Reads only as far as the C2 header says. */
export function readOlympiadBoard(view: DataView): OlympiadBoard | null {
  if (view.byteLength < HEADER + STATUS || view.getUint8(0) !== 0xc2) return null;
  const end = Math.min((view.getUint8(1) << 8) | view.getUint8(2), view.byteLength);
  if (end < HEADER + STATUS) return null;

  const s = HEADER;
  const flags = view.getUint8(s);
  const board: OlympiadBoard = {
    isOpen: (flags & 1) !== 0,
    isQueued: (flags & 2) !== 0,
    isInMatch: (flags & 4) !== 0,
    heroState: Math.min(view.getUint8(s + 1), HERO),
    classIndex: view.getUint8(s + 2),
    points: view.getInt32(s + 3, true),
    matchesToday: view.getUint8(s + 7),
    maximumPerDay: view.getUint8(s + 8),
    weekMatches: view.getUint16(s + 9, true),
    wins: view.getUint16(s + 11, true),
    losses: view.getUint16(s + 13, true),
    draws: view.getUint16(s + 15, true),
    rank: view.getUint16(s + 17, true),
    minimumMatchesForHero: view.getUint8(s + 19),
    tokens: view.getInt32(s + 20, true),
    claimableTokens: view.getInt32(s + 24, true),
    minimumLevel: view.getUint16(s + 28, true),
    minimumResets: view.getUint16(s + 30, true),
    heroSecondsLeft: view.getUint32(s + 32, true),
    secondsToNextWindow: view.getUint32(s + 36, true),
    battleServer: (flags & 8) !== 0 ? view.getUint8(s + 40) : 0,
    rewards: [],
    heroes: [],
    matches: [],
    shop: [],
  };

  let at = HEADER + STATUS;
  let broken = false;
  // A count byte, then its entries; a list cut short ends the reading (`ListReader`).
  const list = <T,>(size: number, read: (o: number) => T, into: T[]) => {
    const count = !broken && at < end ? view.getUint8(at++) : 0;
    for (let i = 0; i < count; i++) {
      if (at + size > end) {
        broken = true;
        return;
      }
      if (into.length < MAX_ENTRIES) into.push(read(at));
      at += size;
    }
  };
  list(
    SIZES.reward,
    o => ({
      group: view.getUint8(o),
      number: view.getUint16(o + 1, true),
      isWing: view.getUint8(o + 3) !== 0,
      isHeld: view.getUint8(o + 4) !== 0,
    }),
    board.rewards
  );
  list(
    SIZES.hero,
    o => ({
      name: readWireString(view, o, o + NAME),
      classIndex: view.getUint8(o + NAME),
      points: view.getInt32(o + NAME + 1, true),
      matches: view.getUint16(o + NAME + 5, true),
      wins: view.getUint16(o + NAME + 7, true),
      timesHero: view.getUint8(o + NAME + 9),
      certified: view.getUint8(o + NAME + 10) !== 0,
    }),
    board.heroes
  );
  list(
    SIZES.match,
    o => ({
      room: view.getUint8(o),
      first: readWireString(view, o + 1, o + 1 + NAME),
      firstClass: view.getUint8(o + 1 + NAME),
      second: readWireString(view, o + 2 + NAME, o + 2 + 2 * NAME),
      secondClass: view.getUint8(o + 2 + 2 * NAME),
    }),
    board.matches
  );
  list(
    SIZES.shop,
    o => ({
      group: view.getUint8(o),
      number: view.getUint16(o + 1, true),
      level: view.getUint8(o + 3),
      price: view.getInt32(o + 4, true),
      category: view.getUint8(o + 8) === 0 ? 0 : 1,
    }),
    board.shop
  );
  return board;
}

/** One Death Record: who killed the hero, how often each way, when last (UTC). */
export type DeathRecord = {
  killer: string;
  guild: string;
  location: string;
  deaths: number;
  kills: number;
  /** Milliseconds since the epoch, UTC. */
  when: number;
  /** 64 palette indices, or null for no guild (an all-zero logo, `ReadGuildMark`). */
  guildMark: number[] | null;
};

const RECORD = 130;
const LOGO = 32;

/** `ReadDeathRecords`: `[count]` at 5, then 130-byte records from 6. */
export function readDeathRecords(view: DataView): DeathRecord[] {
  if (view.byteLength < 6) return [];
  const count = Math.min(view.getUint8(5), Math.floor((view.byteLength - 6) / RECORD));
  const out: DeathRecord[] = [];
  for (let i = 0; i < count; i++) {
    const o = 6 + i * RECORD;
    const n = o + 28 + 28 + 32;
    const mark: number[] = [];
    let any = false;
    for (let b = 0; b < LOGO; b++) {
      const packed = view.getUint8(o + RECORD - LOGO + b);
      any ||= packed !== 0;
      mark.push((packed >> 4) & 0x0f, packed & 0x0f);
    }
    out.push({
      killer: readWireString(view, o, o + 28),
      guild: readWireString(view, o + 28, o + 56),
      location: readWireString(view, o + 56, o + 88),
      deaths: view.getUint16(n, true),
      kills: view.getUint16(n + 2, true),
      when: Date.UTC(
        view.getUint16(n + 4, true),
        view.getUint8(n + 6) - 1,
        view.getUint8(n + 7),
        view.getUint8(n + 8),
        view.getUint8(n + 9)
      ),
      guildMark: any ? mark : null,
    });
  }
  return out;
}

/** `WatchMatchesPerPage`: six rows fit; with more, five a page and a Prev / Next row. */
export const watchMatchesPerPage = (count: number) => (count > 6 ? 5 : 6);

/** `PageCount`: at least one. */
export const pageCount = (count: number, perPage: number) => Math.max(1, Math.ceil(count / perPage));

/** `WinRatePercent`: whole percent, 0 without a match. */
export const winRatePercent = (wins: number, matches: number) => (matches > 0 ? Math.floor((wins * 100) / matches) : 0);

/** `HoldsRewardWeapon`: a held weapon is exchanged by choosing another one. */
export const holdsRewardWeapon = (board: OlympiadBoard) => board.rewards.some(r => !r.isWing && r.isHeld);
