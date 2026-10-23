import { makeAutoObservable } from 'mobx';
import { MuWindows } from '@/controllers/interface';
import { Session } from '../session';
import { TalkToNpcRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import {
  heraldRequest,
  type BattleArea,
  type CaptureLine,
  type Fighter,
  type RegistrationState,
  type SideGuild,
} from './codec';

/** The Herald window's id (`versions/shared/ui/windows/reforge_events`). */
export const HERALD_WINDOW = 'fort_herald';
/** `HeraldNumber`: the Fortress Herald, in every town. */
export const HERALD_NUMBER = 767;
/** `ExpiryGraceMs`: a capture line whose time ran out stays this long for the server's end. */
const EXPIRY_GRACE_MS = 5000;

/**
 * The Fort Siege (server GameLogic/FortSiege): the Herald's registration window
 * (`CFortSiegeWindow`), the crystal capture line (`CFortSiegeHud`) and the battle the server names
 * on the hero's map (sides, area, fighters, kept for the team marks).
 */
export const FortSiege = new (class _FortSiege {
  registration: RegistrationState | null = null;
  /** `performance.now()` of `registration`, for its clocks. */
  registrationAt = 0;
  /** The talk went out and no state came back yet. */
  awaiting = false;

  capture: CaptureLine | null = null;
  captureAt = 0;
  captureMap = -1;

  sides: SideGuild[] = [];
  area: BattleArea = { x1: 0, y1: 0, x2: 0, y2: 0 };
  sidesMap = -1;
  fighters: Fighter[] = [];
  /** EF 03: the owner buff for the warp list's tooltip. */
  ownerBuff = { exp: 0, drop: 0, zenTax: 0 };

  constructor() {
    makeAutoObservable(this);
  }

  /** `OpenHeraldWindow`: no live buttons until the answer (the state may be another character's), then the talk. */
  openHerald(npcId: number): void {
    this.awaiting = true;
    MuWindows.setOpen(HERALD_WINDOW, true);
    const packet = TalkToNpcRequestPacket.createPacket();
    packet.NpcId = npcId;
    Session.sendToGS(packet.buffer);
  }

  setRegistration(state: RegistrationState): void {
    this.registration = state;
    this.registrationAt = performance.now();
    this.awaiting = false;
  }

  register(fort: number): void {
    Session.sendToGS(heraldRequest(1, fort));
  }

  handInSigns(): void {
    Session.sendToGS(heraldRequest(2));
  }

  withdraw(): void {
    Session.sendToGS(heraldRequest(3));
  }

  setCapture(line: CaptureLine, map: number): void {
    this.capture = line;
    this.captureAt = performance.now();
    this.captureMap = map;
  }

  /** `IsShowing`: an active line on the map it came on, until its time and the grace ran out. */
  captureShown(now: number, map: number): boolean {
    const c = this.capture;
    return !!c && c.active && this.captureMap === map && now - this.captureAt <= c.remainingMs + EXPIRY_GRACE_MS;
  }

  /** Seconds left, rounded up: "1 s" until the very end. */
  captureSeconds(now: number): number {
    const c = this.capture;
    if (!c) return 0;
    return Math.max(0, Math.ceil((c.remainingMs - (now - this.captureAt)) / 1000));
  }

  setSides(sides: SideGuild[], area: BattleArea, map: number): void {
    this.sides = sides;
    this.area = area;
    this.sidesMap = map;
    if (sides.length === 0) this.fighters = [];
  }

  setFighters(fighters: Fighter[]): void {
    this.fighters = fighters;
  }

  reset(): void {
    this.registration = null;
    this.awaiting = false;
    this.capture = null;
    this.sides = [];
    this.fighters = [];
  }
})();
