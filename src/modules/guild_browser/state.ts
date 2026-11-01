import { observable, runInAction } from 'mobx';

/**
 * The two guild browsers of the guild window (Mu Reforge): the Guild Wars list (server DC 10) and the
 * Guild Alliance list (DC 12). Both list the guilds with a member online on this game server - exactly
 * the set a war can be declared on or an alliance offered to in one click. A guild with nobody online is
 * reached by typing its name: the server parks a war challenge until its master logs in, and refuses an
 * alliance offer. Port of our C++ client's GameLogic/Reforge/ReforgeGuildBrowser.cpp and
 * Network/Reforge/GuildPackets.cpp.
 *
 * Everything is keyed by guild name: the guild server hands a guild a new short id whenever it had
 * nobody online for a moment.
 */

/** The 32-byte packed 8x8 emblem, as `core/guildMark.ts` draws it; all zero when the guild has none. */
export type PackedMark = number[];

export type OnlineGuild = {
  name: string;
  onlineMembers: number;
  score: number;
  masterOnline: boolean;
  /** Wars: at war, or its master waits for an answer. Alliances: in an alliance. */
  busy: boolean;
  /** Wars only: in our alliance, and allies do not fight each other. */
  ally: boolean;
  /** Wars: who it is busy with. Alliances: the guild leading its alliance. */
  otherGuild: string;
  mark: PackedMark;
};

/** S `GuildWarListState`. */
export const WarState = { none: 0, incoming: 1, sent: 2, atWar: 3 } as const;
export type WarState = (typeof WarState)[keyof typeof WarState];

/** S `GuildAllianceListState`. */
export const AllianceState = { none: 0, incoming: 1, inAlliance: 2 } as const;
export type AllianceState = (typeof AllianceState)[keyof typeof AllianceState];

export type WarList = {
  state: WarState;
  /** S `GuildWarType` 1: Battle Soccer, else a guild war. */
  soccer: boolean;
  ownScore: number;
  enemyScore: number;
  /** What a running war is played to (20 for a war, 100 for battle soccer); 0 while none runs. */
  maximumScore: number;
  otherGuild: string;
  guilds: OnlineGuild[];
};

export type AllianceList = {
  state: AllianceState;
  /** Only the guild leading the alliance may invite into it. */
  isAllianceMaster: boolean;
  allianceSize: number;
  /** The guild leading the own alliance, or the one asking to join it. */
  otherGuild: string;
  guilds: OnlineGuild[];
};

export type BrowserKind = 'wars' | 'alliance';

export const emptyWarList = (): WarList => ({ state: WarState.none, soccer: false, ownScore: 0, enemyScore: 0, maximumScore: 0, otherGuild: '', guilds: [] });
export const emptyAllianceList = (): AllianceList => ({ state: AllianceState.none, isAllianceMaster: false, allianceSize: 0, otherGuild: '', guilds: [] });

// ---- the server's frames ------------------------------------------------------------------------

const NAME = 9;
const MARK = 32;
/** One listed guild: name[9], online, flags, score u32 LE, other[9], mark[32]. */
const ENTRY = NAME + 1 + 1 + 4 + NAME + MARK;
const WAR_HEADER = 20;
const ALLIANCE_HEADER = 18;
const FLAG_MASTER_ONLINE = 0x01;
const FLAG_BUSY = 0x02;
const FLAG_OWN_ALLIANCE = 0x04;
const utf8 = new TextDecoder('utf-8');
const encoder = new TextEncoder();

/** A zero-padded UTF-8 field; a character the server cut in two is dropped. */
function text(view: DataView, at: number, length: number): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + at, length);
  const end = bytes.indexOf(0);
  return utf8.decode(bytes.subarray(0, end < 0 ? length : end)).replace(/�+$/, '');
}

/** The frame's own length (C2), or what arrived when that is shorter. */
const declaredLength = (view: DataView) => Math.min(view.byteLength, view.getUint16(1));

/** The guilds after a list header; a guild cut off by the frame's end is left out. */
function readGuilds(view: DataView, header: number, count: number): OnlineGuild[] {
  const length = declaredLength(view);
  const available = length > header ? Math.floor((length - header) / ENTRY) : 0;
  const guilds: OnlineGuild[] = [];
  for (let i = 0; i < Math.min(count, available); i++) {
    const o = header + i * ENTRY;
    const flags = view.getUint8(o + NAME + 1);
    guilds.push({
      name: text(view, o, NAME),
      onlineMembers: view.getUint8(o + NAME),
      score: view.getUint32(o + NAME + 2, true),
      masterOnline: (flags & FLAG_MASTER_ONLINE) !== 0,
      busy: (flags & FLAG_BUSY) !== 0,
      ally: (flags & FLAG_OWN_ALLIANCE) !== 0,
      otherGuild: text(view, o + NAME + 6, NAME),
      mark: Array.from(new Uint8Array(view.buffer, view.byteOffset + o + ENTRY - MARK, MARK)),
    });
  }
  return guilds;
}

/**
 * C2 DC 10 (S RemoteView/Guild/GuildWarListViewPlugIn.cs): `[state][warType][ownScore][enemyScore]
 * [maxScore][otherGuild:9][count]` from 5, then 56 bytes a guild from 20. Null when the frame is not C2
 * or ends before its header.
 */
export function parseWarList(view: DataView): WarList | null {
  if (view.byteLength < WAR_HEADER || view.getUint8(0) !== 0xc2) return null;
  return {
    state: view.getUint8(5) as WarState,
    soccer: view.getUint8(6) === 1,
    ownScore: view.getUint8(7),
    enemyScore: view.getUint8(8),
    maximumScore: view.getUint8(9),
    otherGuild: text(view, 10, NAME),
    guilds: readGuilds(view, WAR_HEADER, view.getUint8(19)),
  };
}

/**
 * C2 DC 12 (S RemoteView/Guild/GuildAllianceListViewPlugIn.cs): `[state][isAllianceMaster][allianceSize]
 * [otherGuild:9][count]` from 5, then the war list's 56 bytes a guild from 18. Its flags have no "our
 * ally" bit (bit 2 means nothing there), and the other name is the guild leading that alliance.
 */
export function parseAllianceList(view: DataView): AllianceList | null {
  if (view.byteLength < ALLIANCE_HEADER || view.getUint8(0) !== 0xc2) return null;
  return {
    state: view.getUint8(5) as AllianceState,
    isAllianceMaster: view.getUint8(6) !== 0,
    allianceSize: view.getUint8(7),
    otherGuild: text(view, 8, NAME),
    guilds: readGuilds(view, ALLIANCE_HEADER, view.getUint8(17)).map(g => ({ ...g, ally: false })),
  };
}

/** C1 0D DC 11 (S RemoteView/Guild/GuildAllianceRequestViewPlugIn.cs): the asking guild's name; null when short. */
export function parseAllianceRequest(view: DataView): string | null {
  if (view.byteLength < 4 + NAME) return null;
  return text(view, 4, NAME);
}

// ---- the requests -------------------------------------------------------------------------------

/** The bytes of a guild name in a request: the server reads eight (GuildAllianceRequestHandlerPlugIn.NameLength). */
export const REQUEST_NAME_BYTES = 8;

const frame = (bytes: number[]) => new DataView(Uint8Array.from([0xc1, bytes.length + 3, 0xdc, ...bytes]).buffer);

/**
 * The UTF-8 bytes of `name` that fit `length` without splitting a character: the server decodes the field
 * as UTF-8, and a broken tail would name no guild (GuildPackets.cpp `Utf8Prefix`).
 */
export function utf8Prefix(name: string, length: number): number[] {
  const bytes = encoder.encode(name);
  if (bytes.length <= length) return [...bytes];
  let cut = length;
  while (cut > 0 && (bytes[cut] & 0xc0) === 0x80) cut--;
  return [...bytes.subarray(0, cut)];
}

/** C1 04 DC 10: the Guild Wars list (the guild bank's move request without its two slots). */
export const buildWarListRequest = () => frame([0x10]);
/** C1 04 DC 12: the Guild Alliance list. */
export const buildAllianceListRequest = () => frame([0x12]);
/** C1 0C DC 11 name[8]: asks the named guild's master into the hero's alliance. */
export function buildAllianceRequest(guildName: string): DataView {
  const name = utf8Prefix(guildName, REQUEST_NAME_BYTES);
  return frame([0x11, ...name, ...new Array<number>(REQUEST_NAME_BYTES - name.length).fill(0)]);
}

/**
 * C1 00 PublicChatMessage `[character:10][message]`, both UTF-8: the server's chat commands, which the
 * protocol has no packet for ("/war <guild>", "/warstop"). `chat/sendLine.ts` writes ASCII only, and a
 * Cyrillic guild name would reach the server as garbage.
 */
export function buildChatCommand(character: string, line: string): DataView {
  const name = utf8Prefix(character, 10);
  const message = encoder.encode(line);
  const bytes = new Uint8Array(13 + message.length);
  bytes.set([0xc1, bytes.length & 0xff, 0x00]);
  bytes.set(name, 3);
  bytes.set(message, 13);
  return new DataView(bytes.buffer);
}

// ---- the rules (ReforgeGuildBrowser.cpp) --------------------------------------------------------

/** The master may challenge at all (a typed name too): our side is idle. */
export const canDeclare = (list: WarList, isMaster: boolean) => isMaster && list.state === WarState.none;
/** ... and this guild: their master is online, they are free and not our allies. The server checks it all again. */
export const canDeclareOn = (list: WarList, guild: OnlineGuild, isMaster: boolean) =>
  canDeclare(list, isMaster) && guild.masterOnline && !guild.busy && !guild.ally;
/** "/warstop" ends any of: a challenge sent, an incoming one, a running war. */
export const canStop = (list: WarList, isMaster: boolean) => isMaster && list.state !== WarState.none;

/** The master may invite at all: his guild is in no alliance yet, or it leads one. */
export const canInvite = (list: AllianceList, isMaster: boolean) =>
  isMaster && (list.state === AllianceState.none || (list.state === AllianceState.inAlliance && list.isAllianceMaster));
export const canInviteTo = (list: AllianceList, guild: OnlineGuild, isMaster: boolean) =>
  canInvite(list, isMaster) && guild.masterOnline && !guild.busy;

/** The name contains the filter, ignoring case; an empty filter matches every name. */
export const matchesFilter = (name: string, filter: string) => !filter || name.toLowerCase().includes(filter.toLowerCase());

/** A typed filter matches no listed guild: the window offers the typed name itself (the guild may have nobody online). */
export const matchesNoGuild = (guilds: readonly OnlineGuild[], filter: string) =>
  !!filter && !guilds.some(g => matchesFilter(g.name, filter));

// ---- the store ----------------------------------------------------------------------------------

export const GuildBrowser = observable(
  {
    wars: emptyWarList(),
    alliance: emptyAllianceList(),
  },
  { wars: observable.ref, alliance: observable.ref }
);

export function setWarList(list: WarList): void {
  runInAction(() => (GuildBrowser.wars = list));
}

export function setAllianceList(list: AllianceList): void {
  runInAction(() => (GuildBrowser.alliance = list));
}

export function forgetGuildBrowser(): void {
  runInAction(() => {
    GuildBrowser.wars = emptyWarList();
    GuildBrowser.alliance = emptyAllianceList();
  });
}
