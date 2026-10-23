import { readWireString } from '../../core/binaryUtils';

/**
 * The Fort Siege frames as our server writes them (S GameServer/RemoteView/FortSiege/
 * FortSiegeViewPlugIn.cs) and our client reads them (Network/Reforge/FortSiegePackets.cpp).
 * Guild names are 8 bytes, character names 10, UTF-8 cut at a character; emblems 32 bytes.
 */

const GUILD = 8;
const PLAYER = 10;
const LOGO = 32;

/** The fortresses in the server's order (`FortSiegePlugIn.ViewFortKeys`). */
export const FORT_COUNT = 3;
/** Sides 0-2 attack, 3 owns the fortress. */
export const OWNER_SIDE = 3;

export type BattleArea = { x1: number; y1: number; x2: number; y2: number };
export type SideGuild = { guild: string; side: number };
export type Fighter = { name: string; side: number };
/** EF 05: who captures the crystal; not active when nobody does. */
export type CaptureLine = { active: boolean; guild: string; player: string; remainingMs: number };

/** A 64-cell emblem from 32 packed bytes, or null when all zero (no guild). */
function emblem(view: DataView, at: number): number[] | null {
  const cells: number[] = [];
  let any = false;
  for (let i = 0; i < LOGO; i++) {
    const b = view.getUint8(at + i);
    any ||= b !== 0;
    cells.push((b >> 4) & 0x0f, b & 0x0f);
  }
  return any ? cells : null;
}

/** EF 01: `[count]` x `[side][guild:8]`, then `[x1][y1][x2][y2]` (absent from an older server). */
export function readSides(view: DataView): { sides: SideGuild[]; area: BattleArea } {
  const count = view.byteLength > 4 ? view.getUint8(4) : 0;
  const sides: SideGuild[] = [];
  let at = 5;
  for (let i = 0; i < count && at + 1 + GUILD <= view.byteLength; i++, at += 1 + GUILD) {
    sides.push({ side: view.getUint8(at), guild: readWireString(view, at + 1, at + 1 + GUILD) });
  }
  const area =
    at + 4 <= view.byteLength
      ? { x1: view.getUint8(at), y1: view.getUint8(at + 1), x2: view.getUint8(at + 2), y2: view.getUint8(at + 3) }
      : { x1: 0, y1: 0, x2: 0, y2: 0 };
  return { sides, area };
}

/** EF 05 (27 bytes): `[active][guild:8][player:10][remainingMs u32]`. */
export function readCaptureLine(view: DataView): CaptureLine {
  return {
    active: view.getUint8(4) !== 0,
    guild: readWireString(view, 5, 5 + GUILD),
    player: readWireString(view, 13, 13 + PLAYER),
    remainingMs: view.getUint32(23, true),
  };
}

/** EF 06 (C2): `[count u16]` x `[side][name:10]`. */
export function readFighters(view: DataView): Fighter[] {
  const count = view.byteLength >= 7 ? view.getUint16(5, true) : 0;
  const out: Fighter[] = [];
  for (let i = 0, at = 7; i < count && at + 1 + PLAYER <= view.byteLength; i++, at += 1 + PLAYER) {
    out.push({ side: view.getUint8(at), name: readWireString(view, at + 1, at + 1 + PLAYER) });
  }
  return out;
}

/** EF 03: `[count]` x `[warpIndex][allowed]`, then the owner buff `[exp%][drop%][zenTax%]`. */
export function readWarps(view: DataView): { warps: { index: number; allowed: boolean }[]; exp: number; drop: number; zenTax: number } {
  const count = view.byteLength > 4 ? view.getUint8(4) : 0;
  const warps: { index: number; allowed: boolean }[] = [];
  let at = 5;
  for (let i = 0; i < count && at + 2 <= view.byteLength; i++, at += 2) {
    warps.push({ index: view.getUint8(at), allowed: view.getUint8(at + 1) !== 0 });
  }
  const byte = (o: number) => (at + o < view.byteLength ? view.getUint8(at + o) : 0);
  return { warps, exp: byte(0), drop: byte(1), zenTax: byte(2) };
}

/** `Phase`: 0 registration open, 1 closed (the attackers are selected), 2 battle. */
export const Phase = { RegistrationOpen: 0, RegistrationClosed: 1, Battle: 2 } as const;

/** `Role`: 0 no guild, 1 member, 2 the guild master or the assistant (they register and withdraw). */
export const Role = { NoGuild: 0, Member: 1, Master: 2 } as const;

export type ListedGuild = { name: string; signs: number; emblem: number[] | null };
export type FortRegistration = {
  enabled: boolean;
  owner: string;
  ownerEmblem: number[] | null;
  /** Every registered guild, of which `guilds` lists the first five (the most signs). */
  guildCount: number;
  guilds: ListedGuild[];
};
export type RegistrationState = {
  phase: number;
  /** In the battle: until its end. */
  secondsUntilBattle: number;
  secondsUntilClose: number;
  role: number;
  /** -1 none. */
  registeredFort: number;
  ownedFort: number;
  signs: number;
  signsInBag: number;
  maximumAttackers: number;
  minimumSigns: number;
  forts: FortRegistration[];
  /** 1-based place of the hero's guild in its fortress; 0 when the server did not say. */
  rank: number;
  selected: boolean;
};

const fortIndex = (b: number) => (b === 0xff ? -1 : b);

/** EF 04 (C2), `ShowRegistrationStateAsync`. Null when cut short. */
export function readRegistrationState(view: DataView): RegistrationState | null {
  if (view.byteLength < 24) return null;
  const forts: FortRegistration[] = [];
  const fortCount = Math.min(view.getUint8(23), FORT_COUNT);
  let at = 24;
  for (let f = 0; f < fortCount; f++) {
    if (at + 1 + GUILD + LOGO + 2 > view.byteLength) return null;
    const fort: FortRegistration = {
      enabled: view.getUint8(at) !== 0,
      owner: readWireString(view, at + 1, at + 1 + GUILD),
      ownerEmblem: emblem(view, at + 1 + GUILD),
      guildCount: view.getUint8(at + 1 + GUILD + LOGO),
      guilds: [],
    };
    const listed = view.getUint8(at + 2 + GUILD + LOGO);
    at += 3 + GUILD + LOGO;
    for (let g = 0; g < listed; g++) {
      if (at + GUILD + 2 + LOGO > view.byteLength) return null;
      fort.guilds.push({
        name: readWireString(view, at, at + GUILD),
        signs: view.getUint16(at + GUILD, true),
        emblem: emblem(view, at + GUILD + 2),
      });
      at += GUILD + 2 + LOGO;
    }
    forts.push(fort);
  }
  return {
    phase: view.getUint8(5),
    secondsUntilBattle: view.getUint32(6, true),
    secondsUntilClose: view.getUint32(10, true),
    role: view.getUint8(14),
    registeredFort: fortIndex(view.getUint8(15)),
    ownedFort: fortIndex(view.getUint8(16)),
    signs: view.getUint16(17, true),
    signsInBag: view.getUint16(19, true),
    maximumAttackers: view.getUint8(21),
    minimumSigns: view.getUint8(22),
    forts,
    rank: at < view.byteLength ? view.getUint8(at) : 0,
    selected: at + 1 < view.byteLength && view.getUint8(at + 1) !== 0,
  };
}

/** The Herald's buttons (`FortHeraldRequest`): C1 EF 01 [fort] register, 02 hand in the signs, 03 withdraw. */
export function heraldRequest(request: 1 | 2 | 3, fort?: number): DataView {
  const bytes = request === 1 && fort !== undefined ? [0xc1, 5, 0xef, 1, fort] : [0xc1, 4, 0xef, request];
  return new DataView(new Uint8Array(bytes).buffer);
}

/** `CanRegister`: a master of a guild without a fortress or a registration, while it is open. */
export const canRegister = (s: RegistrationState, fort: number) =>
  s.phase === Phase.RegistrationOpen &&
  s.role === Role.Master &&
  s.ownedFort < 0 &&
  s.registeredFort < 0 &&
  !!s.forts[fort]?.enabled;

/** `CanHandInSigns`: a member of a registered guild with a sign in the bag, while it is open. */
export const canHandInSigns = (s: RegistrationState) =>
  s.phase === Phase.RegistrationOpen && s.registeredFort >= 0 && s.signsInBag > 0;

/** `CanWithdraw`: the master of a registered guild, while it is open. */
export const canWithdraw = (s: RegistrationState) =>
  s.phase === Phase.RegistrationOpen && s.role === Role.Master && s.registeredFort >= 0;

/** `OwnRank`: the server's, else one past the listed guilds with more signs; 0 unregistered. */
export function ownRank(s: RegistrationState): number {
  if (s.rank > 0) return s.rank;
  const fort = s.forts[s.registeredFort];
  return fort ? fort.guilds.filter(g => g.signs > s.signs).length + 1 : 0;
}

/** `WouldAttack`: the server's answer when it ranked the guild, else the rank and the signs. */
export const wouldAttack = (s: RegistrationState) =>
  s.rank > 0 ? s.selected : ownRank(s) <= s.maximumAttackers && s.signs >= s.minimumSigns;

/** `ListedGuildAttacks`: in the top and with enough signs. */
export const listedGuildAttacks = (s: RegistrationState, place: number, signs: number) =>
  place < s.maximumAttackers && signs >= s.minimumSigns;
