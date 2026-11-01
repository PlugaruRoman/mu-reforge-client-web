import { makeAutoObservable } from 'mobx';
import { MuWindows } from '@/controllers/interface/windowManager';
import { Session } from '../session';
import { Social } from '../social/social';
import { Hero } from '../hero';

/**
 * Mu Reforge's Party Search (head code D8): a party master lists his party, other players browse the
 * list and join without asking, within the listing's filters. A port of our client's
 * UI/PartySearch/PartySearchWindow.cpp, PartyWindowExtras.cpp, Network/Reforge/PartySearchPackets.cpp
 * and GameLogic/Reforge/ReforgeParty.{h,cpp} without the drawing. The layouts are the server's
 * (S GameServer/RemoteView/Party/PartySearchViewPlugIn.cs, MessageHandler/Party/PartySearch*HandlerPlugIn.cs,
 * PartyChangeMasterHandlerPlugIn.cs).
 */

/** The window's id (`versions/shared/ui/windows/party_search/window.ts`). */
export const PARTY_SEARCH_WINDOW = 'party_search';

export const PARTY_SEARCH_CODE = 0xd8;

/** The fixed UTF-8 fields of the D8 packets (S `NameLength`, `PartySearchSettings.MaximumPasswordLength`). */
export const NAME_LENGTH = 10;
export const PASSWORD_LENGTH = 10;
/** S GameConfiguration.MaximumLevel: a listing which allows it refuses nobody ("Any"). */
export const MAX_LEVEL_CAP = 400;
export const MAX_LEVEL_STEP = 10;
/** The server sends at most this many parties (S PartySearchViewPlugIn.MaximumEntries). */
export const MAX_ENTRIES = 50;
/** The open list asks again this often, so a party that filled up drops off by itself. */
export const REFRESH_INTERVAL_MS = 4000;
/** How long a refused join stays in the window. */
export const JOIN_MESSAGE_MS = 6000;
/** S PartyConfiguration.MaximumLevelGap's default, counted on the character level only. */
export const DEFAULT_LEVEL_GAP = 150;
/** The second click on a member's lead flag must come within this (ReforgeParty.h `Lead::ConfirmWindowMs`). */
export const LEAD_CONFIRM_MS = 5000;

/** The base classes in the class mask's bit order: S CharacterClass.Number / 4. */
export const CLASS_COUNT = 7;
/** The server reads a mask of 0 as every class, the same as all bits set. */
export const ALL_CLASSES_MASK = 0x7f;

/** The flags byte of D8 01, both directions. */
export const ONLY_GUILD_FLAG = 0x01;
export const ONLY_ALLIANCE_FLAG = 0x02;
export const ONLY_ONE_CLASS_FLAG = 0x04;
/** Server -> client only: the player's own auto-accept preference (set through D8 04). */
export const AUTO_ACCEPT_FLAG = 0x08;

/** S PartySearchRegisterResult. */
export enum RegisterResult {
  Success = 0,
  NotPartyMaster = 1,
  NotPossible = 2,
  Error = 3,
}

/** S PartySearchJoinResult. */
export enum JoinResult {
  Success = 0,
  NotFound = 1,
  WrongPassword = 2,
  PartyFull = 3,
  LevelTooHigh = 4,
  ClassNotAllowed = 5,
  GuildOnly = 6,
  AllianceOnly = 7,
  DuplicateClass = 8,
  AlreadyInParty = 9,
  Error = 10,
  /** The server-wide level gap, on top of the listing's own maximum level. */
  LevelGapTooBig = 11,
}

export enum PartySearchTab {
  Find = 0,
  Settings = 1,
}

/** The listing of the player's party, as D8 01 sends and reports it. */
export interface PartySearchSettings {
  active: boolean;
  maxLevel: number;
  classMask: number;
  flags: number;
  password: string;
}

/** One row of the open list (D8 02). */
export interface OpenParty {
  masterName: string;
  mapId: number;
  x: number;
  y: number;
  memberCount: number;
  maxMembers: number;
  hasPassword: boolean;
}

export type RestrictionOption = 'active' | 'guild' | 'alliance' | 'one_class' | 'auto_accept';

// ---- the rules (ReforgeParty.cpp) -------------------------------------------------------------

/** One step of the maximum level, kept inside MAX_LEVEL_STEP..MAX_LEVEL_CAP. */
export const stepMaxLevel = (current: number, steps: number): number =>
  Math.min(MAX_LEVEL_CAP, Math.max(MAX_LEVEL_STEP, current + steps * MAX_LEVEL_STEP));

/** The maximum level the server reported; 0 is "no limit", the cap. */
export const shownMaxLevel = (reported: number): number =>
  reported === 0 ? MAX_LEVEL_CAP : Math.min(MAX_LEVEL_CAP, Math.max(MAX_LEVEL_STEP, reported));

/** The classes to tick for a reported mask: 0 allows every class, so every box belongs ticked. */
export const shownClassMask = (reported: number): number => {
  const classes = reported & ALL_CLASSES_MASK;
  return classes === 0 ? ALL_CLASSES_MASK : classes;
};

export const countClasses = (mask: number): number => {
  let count = 0;
  for (let i = 0; i < CLASS_COUNT; i++) if (mask & (1 << i)) count++;
  return count;
};

export const allowsEveryClass = (mask: number): boolean => {
  const count = countClasses(mask);
  return count === 0 || count === CLASS_COUNT;
};

/** Toggles a restriction flag. The server checks guild-only and alliance-only alike, so one turns the other off. */
export function toggleRestriction(flags: number, flag: number): number {
  const toggled = flags ^ flag;
  if ((toggled & flag) === 0) return toggled;
  if (flag === ONLY_GUILD_FLAG) return toggled & ~ONLY_ALLIANCE_FLAG;
  if (flag === ONLY_ALLIANCE_FLAG) return toggled & ~ONLY_GUILD_FLAG;
  return toggled;
}

export const isFull = (party: Pick<OpenParty, 'memberCount' | 'maxMembers'>): boolean =>
  party.maxMembers > 0 && party.memberCount >= party.maxMembers;

/** The member the lead flag's first click armed, by name: the rows reorder whenever the list comes again. */
export type LeadArm = { name: string; at: number } | null;

/** A click on a member's lead flag: the second on the same member within LEAD_CONFIRM_MS confirms. */
export function pressLead(arm: LeadArm, name: string, now: number): { arm: LeadArm; confirmed: boolean } {
  const live = expireLead(arm, now);
  if (live && live.name === name) return { arm: null, confirmed: true };
  return { arm: { name, at: now }, confirmed: false };
}

export const expireLead = (arm: LeadArm, now: number): LeadArm => (arm && now - arm.at < LEAD_CONFIRM_MS ? arm : null);

// ---- the codec (PartySearchPackets.cpp) --------------------------------------------------------

const decoder = new TextDecoder('utf-8');
const encoder = new TextEncoder();

/** A zero-padded UTF-8 field. */
function readFixedString(packet: DataView, at: number, length: number): string {
  const bytes = new Uint8Array(packet.buffer, packet.byteOffset + at, length);
  const end = bytes.indexOf(0);
  return decoder.decode(end < 0 ? bytes : bytes.subarray(0, end));
}

/** UTF-8 cut to `length` bytes at a character boundary, so the server never reads half a character. */
export function fixedUtf8(text: string, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let used = 0;
  for (const ch of text) {
    const bytes = encoder.encode(ch);
    if (used + bytes.length > length) break;
    out.set(bytes, used);
    used += bytes.length;
  }
  return out;
}

/** The decoded D8 01; null when it is too short. A reported maximum level of 0 is decoded as the cap. */
export function parseStatus(packet: DataView): { result: RegisterResult; settings: PartySearchSettings } | null {
  if (packet.byteLength < 20) return null;
  return {
    result: packet.getUint8(4) as RegisterResult,
    settings: {
      active: packet.getUint8(5) !== 0,
      maxLevel: shownMaxLevel(packet.getUint16(6, true)),
      classMask: packet.getUint8(8),
      flags: packet.getUint8(9),
      password: readFixedString(packet, 10, PASSWORD_LENGTH),
    },
  };
}

const LIST_HEADER = 6;
const ENTRY_LENGTH = 16;

/** The decoded D8 02: at most `count`, what the frame holds and MAX_ENTRIES. */
export function parseList(packet: DataView): OpenParty[] | null {
  if (packet.byteLength < LIST_HEADER) return null;
  const length = Math.min(packet.byteLength, (packet.getUint8(1) << 8) | packet.getUint8(2));
  const count = Math.min(packet.getUint8(5), Math.floor(Math.max(0, length - LIST_HEADER) / ENTRY_LENGTH), MAX_ENTRIES);
  const parties: OpenParty[] = [];
  for (let i = 0; i < count; i++) {
    const at = LIST_HEADER + i * ENTRY_LENGTH;
    parties.push({
      masterName: readFixedString(packet, at, NAME_LENGTH),
      mapId: packet.getUint8(at + 10),
      x: packet.getUint8(at + 11),
      y: packet.getUint8(at + 12),
      memberCount: packet.getUint8(at + 13),
      maxMembers: packet.getUint8(at + 14),
      hasPassword: packet.getUint8(at + 15) !== 0,
    });
  }
  return parties;
}

/** The decoded D8 03. */
export const parseJoinResult = (packet: DataView): JoinResult | null =>
  packet.byteLength < 5 ? null : (packet.getUint8(4) as JoinResult);

const c1 = (subCode: number, body: readonly number[] | Uint8Array = []): DataView => {
  const bytes = new Uint8Array(4 + body.length);
  bytes.set([0xc1, bytes.length, PARTY_SEARCH_CODE, subCode]);
  bytes.set(body, 4);
  return new DataView(bytes.buffer);
};

const concat = (...parts: (readonly number[] | Uint8Array)[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

/** C1 13 D8 01 `[active][maxLevel u16][classMask][flags][password:10]`. Auto accept goes on its own (D8 04). */
export function buildRegister(settings: PartySearchSettings): DataView {
  const maxLevel = Math.min(MAX_LEVEL_CAP, Math.max(0, Math.trunc(settings.maxLevel)));
  return c1(
    0x01,
    concat(
      [settings.active ? 1 : 0, maxLevel & 0xff, maxLevel >> 8, settings.classMask & ALL_CLASSES_MASK, settings.flags & ~AUTO_ACCEPT_FLAG & 0xff],
      fixedUtf8(settings.password, PASSWORD_LENGTH)
    )
  );
}

/** C1 04 D8 02: answered with the open list and the player's own listing (D8 01). */
export const buildListRequest = (): DataView => c1(0x02);

/** C1 18 D8 03 `[masterName:10][password:10]`. */
export const buildJoin = (masterName: string, password: string): DataView =>
  c1(0x03, concat(fixedUtf8(masterName, NAME_LENGTH), fixedUtf8(password, PASSWORD_LENGTH)));

/** C1 05 D8 04 `[on]`. */
export const buildAutoAccept = (on: boolean): DataView => c1(0x04, [on ? 1 : 0]);

/** C1 0E D8 05 `[memberName:10]`: the master hands the lead over (S PartyChangeMasterHandlerPlugIn). */
export const buildChangeMaster = (memberName: string): DataView => c1(0x05, fixedUtf8(memberName, NAME_LENGTH));

// ---- the store -------------------------------------------------------------------------------

const defaultSettings = (): PartySearchSettings => ({
  active: false,
  maxLevel: MAX_LEVEL_CAP,
  classMask: ALL_CLASSES_MASK,
  flags: 0,
  password: '',
});

/** The hero is the master of a party: its first member (the server marks no master). */
export const isPartyMaster = (): boolean => Social.inParty && Social.partyMembers[0]?.name === Hero.name;

/** Our client's CPartySearchWindow and the party window's lead flags, without the drawing. */
export const PartySearch = new (class {
  tab: PartySearchTab = PartySearchTab.Find;
  parties: OpenParty[] = [];
  /** The listing as the controls show it; the server's copy arrives with every list (D8 01). */
  settings: PartySearchSettings = defaultSettings();
  autoAccept = false;
  listed = false;
  /** The player changed a control since the tab opened: a status from the server must not undo that. */
  settingsEdited = false;
  joinPassword = '';
  joinFailure: { result: JoinResult; at: number } | null = null;
  lastListRequest = 0;
  leadArm: LeadArm = null;

  constructor() {
    makeAutoObservable(this);
  }

  get isOpen(): boolean {
    return MuWindows.isOpen(PARTY_SEARCH_WINDOW);
  }

  /** Only the master changes the listing of a party which already exists. */
  get masterOnly(): boolean {
    return Social.inParty && !isPartyMaster();
  }

  /**
   * Shows the window on `tab`. The window's opening asks the server (`opened`), so a window opened
   * by its id alone (the N menu) asks too.
   */
  open(tab: PartySearchTab): void {
    if (this.isOpen) this.selectTab(tab);
    else {
      this.tab = tab;
      MuWindows.setOpen(PARTY_SEARCH_WINDOW, true);
    }
  }

  /** From the window when it opens: a fresh list and listing, no old refusal. */
  opened(): void {
    this.joinFailure = null;
    this.selectTab(this.tab);
  }

  close(): void {
    MuWindows.setOpen(PARTY_SEARCH_WINDOW, false);
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open(this.tab);
  }

  selectTab(tab: PartySearchTab): void {
    this.tab = tab;
    if (!this.isOpen) return;
    // The list request is answered with the list and the player's own listing, which fills the settings.
    this.settingsEdited = false;
    this.requestList();
  }

  requestList(now = Date.now()): void {
    this.lastListRequest = now;
    Session.sendToGS(buildListRequest());
  }

  /** Once in a while from the window: only while the list shows. */
  poll(now = Date.now()): void {
    if (this.joinFailure && now - this.joinFailure.at >= JOIN_MESSAGE_MS) this.joinFailure = null;
    if (!this.isOpen || this.tab !== PartySearchTab.Find || now - this.lastListRequest < REFRESH_INTERVAL_MS) return;
    this.requestList(now);
  }

  /** D8 01. */
  setStatus(result: RegisterResult, settings: PartySearchSettings): void {
    this.autoAccept = (settings.flags & AUTO_ACCEPT_FLAG) !== 0;
    if (result !== RegisterResult.Success) return;
    this.listed = settings.active;
    if (this.settingsEdited) return;
    this.settings = {
      ...settings,
      flags: settings.flags & ~AUTO_ACCEPT_FLAG,
      classMask: shownClassMask(settings.classMask),
    };
  }

  /** D8 02. */
  setParties(parties: OpenParty[]): void {
    this.parties = parties;
  }

  /** D8 03: a join that worked ends the search (the server sends the party list too). */
  joinAnswered(result: JoinResult, now = Date.now()): void {
    if (result === JoinResult.Success) {
      this.joinFailure = null;
      this.close();
      return;
    }
    this.joinFailure = { result, at: now };
    // The counts and the availability may have changed.
    this.requestList(now);
  }

  setJoinPassword(text: string): void {
    this.joinPassword = text;
  }

  join(index: number): boolean {
    const party = this.parties[index];
    if (!party?.masterName) return false;
    Session.sendToGS(buildJoin(party.masterName, this.joinPassword));
    return true;
  }

  toggleOption(option: RestrictionOption): void {
    switch (option) {
      case 'auto_accept':
        // A personal preference, not part of the listing: it goes to the server at once.
        this.autoAccept = !this.autoAccept;
        Session.sendToGS(buildAutoAccept(this.autoAccept));
        return;
      case 'active':
        this.settings.active = !this.settings.active;
        break;
      case 'guild':
        this.settings.flags = toggleRestriction(this.settings.flags, ONLY_GUILD_FLAG);
        break;
      case 'alliance':
        this.settings.flags = toggleRestriction(this.settings.flags, ONLY_ALLIANCE_FLAG);
        break;
      case 'one_class':
        this.settings.flags = toggleRestriction(this.settings.flags, ONLY_ONE_CLASS_FLAG);
        break;
    }
    this.settingsEdited = true;
  }

  toggleClass(index: number): void {
    if (index < 0 || index >= CLASS_COUNT) return;
    this.settings.classMask ^= 1 << index;
    this.settingsEdited = true;
  }

  stepLevel(steps: number): void {
    this.settings.maxLevel = stepMaxLevel(this.settings.maxLevel, steps);
    this.settingsEdited = true;
  }

  setListingPassword(text: string): void {
    this.settings.password = text;
    this.settingsEdited = true;
  }

  /** The server refuses a member who is not the master, and says so; the result shows on the Find tab. */
  save(): void {
    Session.sendToGS(buildRegister(this.settings));
    this.settingsEdited = false;
    this.selectTab(PartySearchTab.Find);
  }

  // ---- the party window's lead flags (PartyWindowExtras.cpp) ----

  /** The master's party has someone to hand the lead to. */
  get leadOffered(): boolean {
    return isPartyMaster() && Social.partyMembers.length >= 2;
  }

  /** The armed member's name while the arm is live. */
  armedName(now = Date.now()): string {
    const arm = expireLead(this.leadArm, now);
    return arm?.name ?? '';
  }

  /** A click on a member's flag: the second on the same member sends D8 05. True when it was sent. */
  giveLead(name: string, now = Date.now()): boolean {
    // The first row is the master himself.
    if (!this.leadOffered || !name || name === Social.partyMembers[0]?.name) {
      this.leadArm = null;
      return false;
    }
    const { arm, confirmed } = pressLead(this.leadArm, name, now);
    this.leadArm = arm;
    if (confirmed) Session.sendToGS(buildChangeMaster(name));
    return confirmed;
  }

  /** The window's tick: an arm older than LEAD_CONFIRM_MS goes. */
  expireLead(now = Date.now()): void {
    if (this.leadArm && !expireLead(this.leadArm, now)) this.leadArm = null;
  }

  reset(): void {
    this.parties = [];
    this.settings = defaultSettings();
    this.autoAccept = false;
    this.listed = false;
    this.settingsEdited = false;
    this.joinPassword = '';
    this.joinFailure = null;
    this.leadArm = null;
    this.tab = PartySearchTab.Find;
  }
})();
