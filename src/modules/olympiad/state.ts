import { makeAutoObservable } from 'mobx';
import { MuWindows } from '@/controllers/interface';
import { Session } from '../session';
import { sendChatLine } from '../chat/sendLine';
import { TalkToNpcRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import type { DeathRecord, OlympiadBoard, ShopLine } from './board';

/** The windows' ids (`versions/shared/ui/windows/olympiad`). */
export const OLYMPIAD_WINDOW = 'olympiad';
export const DEATH_RECORDS_WINDOW = 'death_records';

/** `OlympiadStatue::StatueNumber`: the Battle Statue in Lorencia. */
export const STATUE_NUMBER = 650;

/** The window's actions are chat commands our server reads (S OlympiadChatCommandPlugIn; Network/Reforge/OlympiadPackets.cpp). */
const COMMAND = '/olympiad';

/** A switched-off Olympiad answers only in the chat: the window says so after this long (`NoAnswer`). */
export const NO_ANSWER_MS = 4000;

/**
 * The Olympiad (`COlympiadWindow`, UI/Olympiad/OlympiadWindow.cpp) and the Death Records
 * (`CDeathRecordsWindow`). The server decides everything; these hold its last answer.
 */
export const Olympiad = new (class _Olympiad {
  board: OlympiadBoard | null = null;
  /** `performance.now()` of the board, for its clocks. */
  receivedAt = 0;
  /** When the board was last asked for. */
  askedAt = 0;
  /** The statue the window was opened at: Join Match talks to it. */
  statueId = -1;

  deathRecords: DeathRecord[] = [];
  deathRecordsLoaded = false;

  constructor() {
    makeAutoObservable(this);
  }

  setBoard(board: OlympiadBoard): void {
    this.board = board;
    this.receivedAt = performance.now();
  }

  /** `OpenStatueWindow`: the main page and a fresh board (the last one may be another character's). */
  openAt(statueId: number): void {
    this.statueId = statueId;
    this.board = null;
    MuWindows.setOpen(OLYMPIAD_WINDOW, true);
    this.requestBoard();
  }

  requestBoard(): void {
    this.askedAt = performance.now();
    sendChatLine(`${COMMAND} board`);
  }

  /** The talk to the statue registers the player (or the server says why not). */
  join(): void {
    if (this.statueId >= 0) {
      const packet = TalkToNpcRequestPacket.createPacket();
      packet.NpcId = this.statueId;
      Session.sendToGS(packet.buffer);
    }
    this.requestBoard();
  }

  leave(): void {
    sendChatLine(`${COMMAND} leave`);
    this.requestBoard();
  }

  certify(): void {
    sendChatLine(`${COMMAND} certify`);
  }

  reward(index: number): void {
    sendChatLine(`${COMMAND} reward ${index}`);
  }

  claimTokens(): void {
    sendChatLine(`${COMMAND} tokens`);
  }

  /** `BuildOlympiadBuyCommand`: the index and what the window showed, so the server can refuse a stale row. */
  buy(index: number, entry: ShopLine): void {
    sendChatLine(`${COMMAND} buy ${index} ${entry.group} ${entry.number} ${entry.price} ${entry.level}`);
  }

  watch(room: number): void {
    sendChatLine(`${COMMAND} watch ${room}`);
    MuWindows.setOpen(OLYMPIAD_WINDOW, false);
  }

  setDeathRecords(records: DeathRecord[]): void {
    this.deathRecords = records;
    this.deathRecordsLoaded = true;
  }

  /** `RequestDeathRecords`: C1 04 E0 01 (S DeathRecordsRequestHandlerPlugIn). */
  requestDeathRecords(): void {
    Session.sendToGS(new DataView(new Uint8Array([0xc1, 0x04, 0xe0, 0x01]).buffer));
  }

  reset(): void {
    this.board = null;
    this.deathRecords = [];
    this.deathRecordsLoaded = false;
  }
})();
