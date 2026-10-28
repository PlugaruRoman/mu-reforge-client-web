import { makeAutoObservable } from 'mobx';
import { MuWindows } from '@/controllers/interface';
import { Session } from '../session';
import { sendChatLine } from '../chat/sendLine';
import {
  GuestAccessGenerateRequestPacket,
  GuestAccessListRequestPacket,
  GuestAccessRevokeRequestPacket,
} from '@versions/reforge/packets/ClientToServerPackets';

/** The Guest Access window's id (`versions/shared/ui/windows/reforge_hud`). */
export const GUEST_ACCESS_WINDOW = 'guest_access';

/** The PvP flag's name colours (UI/Reforge/ReforgeNameplates.cpp `FlagRed`.., `BlinkWhite`). */
const FLAG_COLOUR = 'rgb(170, 85, 240)';
const BLINK_COLOUR = 'rgb(255, 255, 255)';
/** `BlinkLeadMs` / `BlinkPeriodMs` (GameLogic/Reforge/ReforgePvpFlags.h). */
const BLINK_LEAD_MS = 5000;
const BLINK_PERIOD_MS = 400;

/** The server's `GuestPermissions` bits, in the window's order (`PermissionCount`). */
export const GUEST_PERMISSIONS = 11;
/** `MinHours` / `MaxHours` / `DefaultHours`. */
export const GUEST_HOURS = { min: 1, max: 72, initial: 3 } as const;
/** `GuestAccessAction.MaxSessionsPerAccount`. */
export const GUEST_MAX_SESSIONS = 10;
/** `GuestAccessNameBytes`: the session name field, UTF-8. */
const GUEST_NAME_BYTES = 20;

export type GuestSession = { name: string; password: string; remainingSeconds: number; permissions: number };
export type MobSpot = { x: number; y: number; name: string };

/** `IsBlinkPhase`: the second half of each blink period during the last seconds. */
export function pvpFlagColour(remainingMs: number, now: number): string {
  return remainingMs < BLINK_LEAD_MS && now % BLINK_PERIOD_MS >= BLINK_PERIOD_MS / 2 ? BLINK_COLOUR : FLAG_COLOUR;
}

/** `FitUtf8`: at most `bytes` of UTF-8, cut at a character. */
export function fitUtf8(text: string, bytes: number): Uint8Array {
  const encoded = new TextEncoder().encode(text);
  let end = Math.min(encoded.length, bytes);
  while (end > 0 && end < encoded.length && (encoded[end] & 0xc0) === 0x80) end--;
  return encoded.slice(0, end);
}

/**
 * The small Mu Reforge HUD pieces our client draws (UI/Reforge, UI/Party, UI/GuestAccess): the
 * party members' buffs, the PvP flags of the players in view, the map's monster spots, Guest Access
 * and whether this login is a guest one.
 */
export const ReforgeHud = new (class _ReforgeHud {
  /** D8 04: the effects of each member, in party list order. */
  partyBuffs: number[][] = [];
  /** EA: the flag's end (`performance.now()`) by object id. */
  pvpFlags = new Map<number, number>();
  /** Advances while a flag is up, so the names blink and fade without a packet. */
  pvpClock = 0;
  /** D5: the monster spots of the hero's map. */
  mobSpots: MobSpot[] = [];

  /** D0 04: this login plays a guest session; the window is the owner's. */
  isGuest = false;
  guestSessions: GuestSession[] = [];
  /** `performance.now()` of the session list. */
  guestListAt = 0;
  /** The answer to the last generate request; `pending` until it came. */
  generated: { pending: boolean; success: boolean; name: string; password: string } | null = null;
  /** E4 01: trade, party, duel and friend requests reach the hero (S Character.BlockRequests, false by default). */
  requestsAllowed = true;

  private pvpTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    makeAutoObservable<this, 'pvpTimer'>(this, { pvpTimer: false });
  }

  setPartyBuffs(members: number[][]): void {
    this.partyBuffs = members;
  }

  /** `SetFlag`: counted down here, the server sends nothing when it ends. */
  setPvpFlag(id: number, seconds: number, now: number): void {
    this.pvpFlags.set(id, now + seconds * 1000);
    this.pvpClock = now;
    if (!this.pvpTimer) this.pvpTimer = setInterval(() => this.tickPvp(performance.now()), BLINK_PERIOD_MS / 2);
  }

  tickPvp(now: number): void {
    this.pvpClock = now;
    for (const [id, end] of this.pvpFlags) if (end <= now) this.pvpFlags.delete(id);
    if (this.pvpFlags.size === 0 && this.pvpTimer) {
      clearInterval(this.pvpTimer);
      this.pvpTimer = null;
    }
  }

  /** The name colour of object `id`: the flag's while it lasts. */
  pvpTint(id: number): string | null {
    const now = this.pvpClock;
    const end = this.pvpFlags.get(id & 0x7fff);
    return end === undefined || end <= now ? null : pvpFlagColour(end - now, now);
  }

  setMobSpots(spots: MobSpot[]): void {
    this.mobSpots = spots;
  }

  setGuest(isGuest: boolean): void {
    this.isGuest = isGuest;
    if (isGuest) MuWindows.setOpen(GUEST_ACCESS_WINDOW, false);
  }

  /** Opening the window asks for the list (`RequestGuestAccessList`). */
  requestGuestList(): void {
    Session.sendToGS(GuestAccessListRequestPacket.createPacket().buffer);
  }

  setGuestSessions(sessions: GuestSession[]): void {
    this.guestSessions = sessions;
    this.guestListAt = performance.now();
  }

  /** `BuildGuestAccessGenerateRequest`: permissions, minutes, the name as UTF-8 cut at a character. */
  generateGuest(permissions: number, hours: number, name: string): void {
    const packet = GuestAccessGenerateRequestPacket.createPacket();
    packet.Permissions = permissions;
    packet.DurationMinutes = Math.min(Math.max(hours, GUEST_HOURS.min), GUEST_HOURS.max) * 60;
    const bytes = fitUtf8(name.trim(), GUEST_NAME_BYTES);
    new Uint8Array(packet.buffer.buffer, packet.buffer.byteOffset + 8, GUEST_NAME_BYTES).set(bytes);
    this.generated = { pending: true, success: false, name: '', password: '' };
    Session.sendToGS(packet.buffer);
  }

  setGenerated(success: boolean, name: string, password: string): void {
    this.generated = { pending: false, success, name, password };
    if (success) this.requestGuestList();
  }

  /** The list may have changed since the click: the session is named by its name and password (`FindSession`). */
  revokeGuest(session: GuestSession): void {
    const index = this.guestSessions.findIndex(s => s.name === session.name && s.password === session.password);
    if (index < 0) return;
    const packet = GuestAccessRevokeRequestPacket.createPacket();
    packet.SessionIndex = index;
    Session.sendToGS(packet.buffer);
  }

  /** Seconds left of a listed session now. */
  guestSecondsLeft(session: GuestSession, now: number): number {
    return Math.max(0, session.remainingSeconds - Math.floor((now - this.guestListAt) / 1000));
  }

  setRequestsAllowed(allowed: boolean): void {
    this.requestsAllowed = allowed;
  }

  /** `Requests::Toggle` (GameLogic/Reforge/ReforgeRequests.cpp): flips now, asks the server; its E4 01 confirms. */
  toggleRequests(): void {
    this.requestsAllowed = !this.requestsAllowed;
    sendChatLine(this.requestsAllowed ? '/requests on' : '/requests off');
  }

  reset(): void {
    this.requestsAllowed = true;
    this.partyBuffs = [];
    this.pvpFlags.clear();
    this.mobSpots = [];
    this.isGuest = false;
    this.guestSessions = [];
    this.generated = null;
  }
})();
