import { makeAutoObservable } from 'mobx';
import { Session } from '../session';
import { CloseNpcRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import { EnterEmpireGuardianEventPacket } from '@versions/reforge/packets/ClientToServerPackets';

/** The boxes our client shows (WSclient.cpp `ReceiveEnterEmpireGuardianEvent`, `ReceiveResultEmpireGuardian`). */
export type GuardianBox =
  | { kind: 'entryDelay'; minutes: number }
  | { kind: 'missingQuestItem' | 'full' | 'zoneCooldown' | 'partyRequired' | 'failed' }
  | { kind: 'zoneCleared'; round: number; zone: number }
  | { kind: 'roundCleared'; round: number; experience: number };

/** The phase the timer shows (`ImperialGuardianRemainingTime.Phase`): 1 standby, 2 battle. */
export const PHASE_BATTLE = 2;

/**
 * The Fortress of Imperial Guardian timer (`CEmpireGuardianTimer`, UI/NPCs/EmpireGuardianTimer.cpp):
 * round and zone, standby or time left with the monsters left, and the boxes of the entry and the
 * result. Shown from the first F7 04 until a clear result.
 */
export const ImperialGuardian = new (class _ImperialGuardian {
  open = false;
  round = 0;
  zone = 0;
  phase = 0;
  remainMs = 0;
  /** `performance.now()` of `remainMs`. */
  remainAt = 0;
  monsterCount = 0;
  box: GuardianBox | null = null;
  /** Adviser Jerinteu's window (`CEmpireGuardianNPC`, NpcWindow JerintGaionEvententry). */
  entryOpen = false;

  constructor() {
    makeAutoObservable(this);
  }

  /** `SetEntryInfo`: entered; the timer shows once the server counts. */
  entered(round: number, zone: number, remainMs: number): void {
    this.round = round;
    this.zone = zone;
    this.setRemain(remainMs);
  }

  /** `UpdateTimer`: shows the timer. */
  tick(phase: number, remainMs: number, monsterCount: number): void {
    this.open = true;
    this.phase = phase;
    this.monsterCount = monsterCount;
    this.setRemain(remainMs);
  }

  private setRemain(ms: number): void {
    this.remainMs = ms;
    this.remainAt = performance.now();
  }

  /** The milliseconds the clock shows now. */
  msLeft(now: number): number {
    return Math.max(0, this.remainMs - (now - this.remainAt));
  }

  /** A clear result: its box, and the timer hides (`HideTimer`). */
  showResult(box: GuardianBox): void {
    this.box = box;
    this.open = false;
  }

  showBox(box: GuardianBox): void {
    this.box = box;
  }

  closeBox(): void {
    this.box = null;
  }

  openEntry(): void {
    this.entryOpen = true;
  }

  /** Close: OpenMU keeps the dialog open until a `CloseNpcRequest` arrives. */
  closeEntry(): void {
    this.entryOpen = false;
    Session.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
  }

  /** `SendEnterEmpireGuardianEvent`: the server looks the Gaion's Order up itself and ignores the slot. */
  enter(): void {
    const packet = EnterEmpireGuardianEventPacket.createPacket();
    packet.ItemSlot = 0xff;
    Session.sendToGS(packet.buffer);
    this.closeEntry();
  }

  reset(): void {
    this.open = false;
    this.box = null;
    this.entryOpen = false;
  }
})();
