import { observable, runInAction } from 'mobx';

/**
 * Our server's Deep Dungeon (S GameLogic/PlugIns/InvasionEvents/DeepDungeon*.cs): five floors, server
 * maps 90-94, open twice a day. The Dungeon Guide in Lorencia (NPC 766) opens the floor selection
 * (C1 E3 01); inside, the server pushes the time left (C1 E3 03). The server decides who may enter;
 * these rules only decide what the window and the HUD show. Port of our client's
 * GameLogic/Reforge/ReforgeDeepDungeon.cpp and Network/Reforge/DeepDungeonPackets.cpp.
 */

export const MAX_FLOORS = 5;
/** Server maps 90-94 (`ENUM_WORLD.WD_90DEEP_DUNGEON1..WD_94DEEP_DUNGEON5`). */
export const FIRST_FLOOR_MAP = 90;

export type Difficulty = 'easy' | 'normal' | 'hard' | 'veryHard' | 'extreme';

export type FloorInfo = {
  monsterLevelMin: number;
  monsterLevelMax: number;
  resetsMin: number;
  /** The last floor has no upper bound. */
  resetsMax: number;
  difficulty: Difficulty;
};

/**
 * A copy of the server's floor ladder (DeepDungeonEvent.cs: the levels of the floor's monsters, the
 * reset bracket it is tuned for), as our client keeps it: only shown, updated by hand.
 */
export const FLOORS: readonly FloorInfo[] = [
  { monsterLevelMin: 105, monsterLevelMax: 112, resetsMin: 1, resetsMax: 10, difficulty: 'easy' },
  { monsterLevelMin: 115, monsterLevelMax: 122, resetsMin: 11, resetsMax: 20, difficulty: 'normal' },
  { monsterLevelMin: 125, monsterLevelMax: 132, resetsMin: 21, resetsMax: 30, difficulty: 'hard' },
  { monsterLevelMin: 135, monsterLevelMax: 140, resetsMin: 31, resetsMax: 40, difficulty: 'veryHard' },
  { monsterLevelMin: 142, monsterLevelMax: 148, resetsMin: 41, resetsMax: 50, difficulty: 'extreme' },
];

export type FloorSelection = { floorCount: number; minimumLevel: number; remainingSeconds: number };
export type Countdown = { floor: number; remainingSeconds: number };

export const clampFloorCount = (n: number): number => Math.min(MAX_FLOORS, Math.max(1, n));

/**
 * `[C1][len][E3][01][floorCount][remainingMinutes][minimumLevel u16 LE]`, and since a later server
 * `[remainingSeconds u16 LE]` (len 10). The declared length decides the form
 * (S RemoteView/DeepDungeon/DeepDungeonViewPlugIn.cs:52-61).
 */
export function parseFloorSelection(view: DataView): FloorSelection | null {
  if (view.byteLength < 8) return null;
  const withSeconds = view.getUint8(1) >= 10 && view.byteLength >= 10;
  return {
    floorCount: clampFloorCount(view.getUint8(4)),
    minimumLevel: view.getUint16(6, true),
    remainingSeconds: withSeconds ? view.getUint16(8, true) : view.getUint8(5) * 60,
  };
}

/** `[C1][07][E3][03][floor][remainingSeconds u16 LE]` (DeepDungeonViewPlugIn.cs:77-87). */
export function parseCountdown(view: DataView): Countdown | null {
  if (view.byteLength < 7) return null;
  return { floor: view.getUint8(4), remainingSeconds: view.getUint16(5, true) };
}

/** `[C1][05][E3][02][floor]`, the floor 1-based (S MessageHandler/DeepDungeon/DeepDungeonEnterHandlerPlugIn.cs). */
export function buildEnterRequest(floor: number): DataView {
  return new DataView(Uint8Array.from([0xc1, 0x05, 0xe3, 0x02, floor & 0xff]).buffer);
}

/** The 0-based floor whose reset bracket holds the character (`SuggestedFloor`). */
export function suggestedFloor(resets: number, floorCount: number): number {
  for (let i = clampFloorCount(floorCount) - 1; i > 0; i--) {
    if (resets >= FLOORS[i].resetsMin) return i;
  }
  return 0;
}

/** The seconds left `elapsedMs` after `remainingSeconds` arrived; never negative. */
export const secondsLeft = (remainingSeconds: number, elapsedMs: number): number =>
  Math.max(0, remainingSeconds - Math.floor(Math.max(0, elapsedMs) / 1000));

export type Urgency = 'calm' | 'soon' | 'last';

/** The window's timer: amber in the last ten minutes, red in the last three. */
export const windowUrgency = (s: number): Urgency => (s <= 180 ? 'last' : s <= 600 ? 'soon' : 'calm');
/** The HUD's timer: amber in the last five minutes, red in the last one (with the warning). */
export const hudUrgency = (s: number): Urgency => (s <= 60 ? 'last' : s <= 300 ? 'soon' : 'calm');

export const DeepDungeon = observable(
  {
    selection: null as FloorSelection | null,
    selectionAtMs: 0,
    countdown: null as Countdown | null,
    countdownAtMs: 0,
  },
  {},
  { deep: false }
);

export function setSelection(selection: FloorSelection, nowMs: number): void {
  runInAction(() => {
    DeepDungeon.selection = selection;
    DeepDungeon.selectionAtMs = nowMs;
  });
}

export function setCountdown(countdown: Countdown, nowMs: number): void {
  runInAction(() => {
    DeepDungeon.countdown = countdown;
    DeepDungeon.countdownAtMs = nowMs;
  });
}

export function forgetDeepDungeon(): void {
  runInAction(() => {
    DeepDungeon.selection = null;
    DeepDungeon.countdown = null;
  });
}
