import { describe, expect, it } from 'vitest';
import {
  canHandInSigns,
  canRegister,
  canWithdraw,
  heraldRequest,
  ownRank,
  readCaptureLine,
  readFighters,
  readRegistrationState,
  readSides,
  readWarps,
  wouldAttack,
} from './codec';

/** Bytes as S GameServer/RemoteView/FortSiege/FortSiegeViewPlugIn.cs writes them. */
const ascii = (s: string, size: number) => [...Array.from(s, c => c.charCodeAt(0)), ...new Array(size - s.length).fill(0)];
const view = (bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);
const u16 = (n: number) => [n & 0xff, n >> 8];
const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];

describe('fort siege frames (EF)', () => {
  it('reads the sides and the battle area (EF 01)', () => {
    const body = [2, 0, ...ascii('Alpha', 8), 3, ...ascii('Owners', 8), 10, 20, 30, 40];
    const { sides, area } = readSides(view([0xc1, 5 + body.length - 1, 0xef, 0x01, ...body]));
    expect(sides).toEqual([
      { side: 0, guild: 'Alpha' },
      { side: 3, guild: 'Owners' },
    ]);
    expect(area).toEqual({ x1: 10, y1: 20, x2: 30, y2: 40 });
  });

  it('reads the capture line (EF 05, 27 bytes)', () => {
    const bytes = [0xc1, 27, 0xef, 0x05, 1, ...ascii('Alpha', 8), ...ascii('Hero', 10), ...u32(12500)];
    expect(bytes).toHaveLength(27);
    expect(readCaptureLine(view(bytes))).toEqual({ active: true, guild: 'Alpha', player: 'Hero', remainingMs: 12500 });
  });

  it('reads the fighters (EF 06, C2) and the warps (EF 03)', () => {
    const fighters = [0xc2, 0, 29, 0xef, 0x06, ...u16(2), 1, ...ascii('One', 10), 3, ...ascii('Two', 10)];
    expect(readFighters(view(fighters))).toEqual([
      { side: 1, name: 'One' },
      { side: 3, name: 'Two' },
    ]);
    const warps = [0xc1, 12, 0xef, 0x03, 2, 7, 1, 8, 0, 10, 15, 3];
    expect(readWarps(view(warps))).toEqual({
      warps: [
        { index: 7, allowed: true },
        { index: 8, allowed: false },
      ],
      exp: 10,
      drop: 15,
      zenTax: 3,
    });
  });

  it('reads the Herald state (EF 04) and decides the buttons', () => {
    const logo = new Array(32).fill(0);
    const header = [0xc2, 0, 0, 0xef, 0x04, 0, ...u32(3600), ...u32(600), 2, 1, 0xff, ...u16(12), ...u16(5), 3, 10, 2];
    const fort0 = [1, ...ascii('Owner', 8), ...logo, 0, 0];
    const fort1 = [1, ...ascii('', 8), ...logo, 2, 2, ...ascii('Mine', 8), ...u16(12), ...logo, ...ascii('Rival', 8), ...u16(30), ...logo];
    const bytes = [...header, ...fort0, ...fort1, 0, 0];
    bytes[1] = bytes.length >> 8;
    bytes[2] = bytes.length & 0xff;
    const s = readRegistrationState(view(bytes));
    if (!s) throw new Error('registration state not read');
    expect(s).toMatchObject({ phase: 0, secondsUntilBattle: 3600, secondsUntilClose: 600, role: 2, registeredFort: 1, ownedFort: -1 });
    expect(s).toMatchObject({ signs: 12, signsInBag: 5, maximumAttackers: 3, minimumSigns: 10, rank: 0, selected: false });
    expect(s.forts[0]).toMatchObject({ enabled: true, owner: 'Owner', ownerEmblem: null, guildCount: 0, guilds: [] });
    expect(s.forts[1].guilds.map(g => [g.name, g.signs])).toEqual([
      ['Mine', 12],
      ['Rival', 30],
    ]);
    expect(canRegister(s, 0)).toBe(false); // already registered
    expect(canHandInSigns(s)).toBe(true);
    expect(canWithdraw(s)).toBe(true);
    expect(ownRank(s)).toBe(2); // Rival has more signs
    expect(wouldAttack(s)).toBe(true);
    expect(readRegistrationState(view(bytes.slice(0, 40)))).toBeNull();
  });

  it('builds the Herald requests as FortHeraldRequestHandlerPlugIn reads them', () => {
    const bytes = (v: DataView) => [...new Uint8Array(v.buffer)];
    expect(bytes(heraldRequest(1, 2))).toEqual([0xc1, 5, 0xef, 1, 2]);
    expect(bytes(heraldRequest(2))).toEqual([0xc1, 4, 0xef, 2]);
    expect(bytes(heraldRequest(3))).toEqual([0xc1, 4, 0xef, 3]);
  });
});
