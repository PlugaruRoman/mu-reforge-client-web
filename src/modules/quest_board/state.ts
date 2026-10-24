import { observable, runInAction } from 'mobx';

/**
 * Captain Slough's quest board (NPC 763; S GameLogic/PlayerActions/Quests/QuestBoardAction.cs).
 * Port of our C++ client's GameLogic/Reforge/ReforgeQuestBoard.cpp and Network/Reforge/
 * QuestBoardPackets.cpp. The quests of a map's chain are taken one after the other; only one is
 * active at a time.
 */

/** S `QuestBoardEntryState`, a wire contract. */
export const QUEST_STATE = { locked: 0, available: 1, active: 2, completed: 3 } as const;

export type BoardQuest = {
  /** Its number in the chain, which the accept request names. */
  number: number;
  state: number;
  monsterNumber: number;
  requiredKills: number;
  currentKills: number;
  name: string;
  /** The server's summary, e.g. "1.2M Zen + 30 Points + 3x Bless". */
  reward: string;
};

const HEADER = 6;
const ENTRY = 100;
const NAME = 28;
const REWARD = 64;
const utf8 = new TextDecoder('utf-8');

/** A zero-padded UTF-8 field; the server may cut its last character in two, which is dropped. */
function text(view: DataView, at: number, length: number): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + at, length);
  const end = bytes.indexOf(0);
  return utf8.decode(bytes.subarray(0, end < 0 ? length : end)).replace(/�+$/, '');
}

/**
 * DF 01 (the board of the hero's map) and DF 05 (the active quests of every chain), S
 * RemoteView/Quest/QuestBoardViewPlugIn.cs: `[C2][len u16 BE][DF][sub][count]` + 100 bytes a quest
 * (number, state, monster u16, required u16, current u16 LE, name[28], reward[64]). Null when the
 * frame is not C2 or ends before its count; a quest past its end is not read.
 */
export function parseQuestBoard(view: DataView): BoardQuest[] | null {
  if (view.byteLength < HEADER || view.getUint8(0) !== 0xc2) return null;
  const length = Math.min(view.byteLength, view.getUint16(1));
  if (length < HEADER) return null;
  const count = Math.min(view.getUint8(5), Math.floor((length - HEADER) / ENTRY));
  const quests: BoardQuest[] = [];
  for (let i = 0; i < count; i++) {
    const o = HEADER + i * ENTRY;
    quests.push({
      number: view.getUint8(o),
      state: view.getUint8(o + 1),
      monsterNumber: view.getUint16(o + 2, true),
      requiredKills: view.getUint16(o + 4, true),
      currentKills: view.getUint16(o + 6, true),
      name: text(view, o + 8, NAME),
      reward: text(view, o + 8 + NAME, REWARD),
    });
  }
  return quests;
}

/** The kill goal is reached; a quest without one never is. */
export const goalReached = (q: BoardQuest) => q.requiredKills > 0 && q.currentKills >= q.requiredKills;
export const canAccept = (q: BoardQuest) => q.state === QUEST_STATE.available;
/** The server pays an active quest only once its goal is reached. */
export const canClaim = (q: BoardQuest) => q.state === QUEST_STATE.active && goalReached(q);
/** How far the kills are, 0..1. */
export const progress = (q: BoardQuest) => (q.requiredKills ? Math.min(1, Math.max(0, q.currentKills / q.requiredKills)) : 0);

/** The quest the board shows: the active one, else the next available one; -1 when none. */
export function currentQuest(board: readonly BoardQuest[]): number {
  const active = board.findIndex(q => q.state === QUEST_STATE.active);
  return active >= 0 ? active : board.findIndex(q => q.state === QUEST_STATE.available);
}

const frame = (bytes: number[]) => new DataView(Uint8Array.from([0xc1, bytes.length + 3, 0xdf, ...bytes]).buffer);
/** C1 05 DF 02 number. */
export const buildAcceptRequest = (questNumber: number) => frame([0x02, questNumber & 0xff]);
/** C1 04 DF 03: claims the active quest. */
export const buildClaimRequest = () => frame([0x03]);
/** C1 04 DF 01: the board again. */
export const buildBoardRequest = () => frame([0x01]);
/** C1 04 DF 04: the active quests, answered with DF 05. */
export const buildActiveRequest = () => frame([0x04]);

export const QuestBoard = observable(
  {
    /** The last board (DF 01). */
    board: [] as BoardQuest[],
    /** The active quests of every chain (DF 05). */
    active: [] as BoardQuest[],
  },
  { board: observable.ref, active: observable.ref }
);

export function setBoard(board: BoardQuest[]): void {
  runInAction(() => (QuestBoard.board = board));
}

export function setActiveQuests(active: BoardQuest[]): void {
  runInAction(() => (QuestBoard.active = active));
}

export function forgetQuestBoard(): void {
  runInAction(() => {
    QuestBoard.board = [];
    QuestBoard.active = [];
  });
}
