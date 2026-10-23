import { makeAutoObservable } from 'mobx';
import { Session } from '../session';

/** The window's id (`versions/shared/ui/windows/soul_points/window.ts`). */
export const SOUL_WINDOW = 'soul_points';

export const ATTRIBUTE_COUNT = 16;
export const CATEGORY_COUNT = 4;
export const PER_CATEGORY = ATTRIBUTE_COUNT / CATEGORY_COUNT;
export const MILESTONE_COUNT = 3;

/** S GameLogic/SoulPoints/SoulResetPayment.cs: W Coin (C), W Coin (P), Jewel of Bless. */
export enum SoulPayment {
  WCoinC = 0,
  WCoinP = 1,
  Bless = 2,
}

/** S GameLogic/SoulPoints/SoulResetResult.cs. */
export enum SoulResetResult {
  Success = 0,
  InvalidPayment = 1,
  NothingToReset = 2,
  NotEnoughWCoinC = 3,
  NotEnoughWCoinP = 4,
  NotEnoughJewels = 5,
}

export type SoulDefinition = {
  cap: number;
  thresholds: readonly number[];
  /** Whole numbers instead of a fraction shown as a percentage. */
  flat: boolean;
  /** The primary bonus at the cap. */
  primaryMax: number;
  milestones: readonly number[];
  /** Applied as a decrease (damage taken): shown with a minus. */
  reduction: boolean;
  /** The milestone multiplies with the primary instead of adding to it. */
  multiplies: boolean;
};

const pct = (primaryMax: number, milestones: number[], multiplies: boolean, reduction = false): SoulDefinition => ({
  cap: 100, thresholds: [40, 70, 100], flat: false, primaryMax, milestones, reduction, multiplies,
});

/**
 * The server's SoulPointDefinitions.CreateDefinitions in SoulAttributeType order (S DataModel/Entities/
 * SoulAttributeType.cs), as our client keeps them (GameLogic/Reforge/ReforgeSoulPoints.cpp). The
 * category is index / 4: attack, defense, support, misc.
 */
export const SOUL_DEFINITIONS: readonly SoulDefinition[] = [
  pct(0.15, [0.02, 0.03, 0.05], true),
  pct(0.1, [0.08, 0.16, 0.25], false),
  pct(0.1, [0.08, 0.16, 0.25], false),
  { cap: 60, thresholds: [20, 40, 60], flat: false, primaryMax: 0.04, milestones: [0.01, 0.02, 0.03], reduction: false, multiplies: false },
  pct(0.15, [0.05, 0.1, 0.15], true),
  pct(0.04, [0.005, 0.01, 0.02], false),
  pct(0.2, [0.06, 0.12, 0.2], true),
  pct(0.03, [0.005, 0.01, 0.015], true, true),
  pct(0.1, [0.01, 0.03, 0.06], false),
  pct(0.1, [0.01, 0.03, 0.06], false),
  pct(0.1, [0.02, 0.04, 0.06], true),
  { cap: 60, thresholds: [20, 40, 60], flat: true, primaryMax: 180, milestones: [30, 60, 90], reduction: false, multiplies: false },
  pct(0.1, [0.03, 0.06, 0.09], true),
  pct(0.025, [0.005, 0.01, 0.015], true),
  pct(0.025, [0.01, 0.015, 0.02], true),
  pct(0.01, [0.002, 0.004, 0.006], false),
];

/** The highest milestone reached with `points`, or -1. */
export function reachedMilestone(attribute: number, points: number): number {
  const def = SOUL_DEFINITIONS[attribute];
  let reached = -1;
  def?.thresholds.forEach((threshold, i) => points >= threshold && (reached = i));
  return reached;
}

/** The primary bonus `points` buy, clamped to the cap. */
export function primaryValue(attribute: number, points: number): number {
  const def = SOUL_DEFINITIONS[attribute];
  if (!def) return 0;
  return (def.primaryMax * Math.min(def.cap, Math.max(0, points))) / def.cap;
}

/** The points still free while `planned` is over `committed` (`PointsLeft`). */
export function pointsLeft(available: number, committed: readonly number[], planned: readonly number[]): number {
  const spent = planned.reduce((sum, p, i) => sum + Math.max(0, p - (committed[i] ?? 0)), 0);
  return Math.max(0, available - spent);
}

/** `planned` moved by `delta`, kept between the committed points and the cap, raised by no more than what is left (`Step`). */
export function step(planned: number, committed: number, cap: number, left: number, delta: number): number {
  const highest = Math.max(committed, Math.min(cap, planned + Math.max(0, left)));
  return Math.min(highest, Math.max(committed, planned + delta));
}

/**
 * Our client's Soul Point window state (UI/SoulPoints/SoulPointWindow.cpp) without its drawing: the
 * server's report (DE 01) and the allocation the player plans before investing it.
 */
export const SoulPoints = new (class {
  known = false;
  available = 0;
  allocated: number[] = new Array<number>(ATTRIBUTE_COUNT).fill(0);
  caps: number[] = SOUL_DEFINITIONS.map(d => d.cap);
  /** Per payment: what the account holds (Bless: bag and jewel bank) and what a reset costs. */
  balances: number[] = [0, 0, 0];
  costs: number[] = [0, 0, 0];
  /** The plan: committed points plus what the player added, per attribute. */
  planned: number[] = new Array<number>(ATTRIBUTE_COUNT).fill(0);
  lastReset: SoulResetResult | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /** DE 01: the report replaces the plan with what the server holds. */
  setInfo(available: number, slots: { type: number; points: number; cap: number }[], balances: number[], costs: number[]): void {
    this.known = true;
    this.available = available;
    this.allocated = new Array<number>(ATTRIBUTE_COUNT).fill(0);
    this.caps = SOUL_DEFINITIONS.map(d => d.cap);
    for (const slot of slots) {
      if (slot.type >= ATTRIBUTE_COUNT) continue;
      this.allocated[slot.type] = slot.points;
      this.caps[slot.type] = slot.cap;
    }
    this.planned = [...this.allocated];
    this.balances = balances;
    this.costs = costs;
  }

  setResetResult(result: SoulResetResult): void {
    this.lastReset = result;
  }

  get left(): number {
    return pointsLeft(this.available, this.allocated, this.planned);
  }

  get investedTotal(): number {
    return this.allocated.reduce((a, b) => a + b, 0);
  }

  get pendingTotal(): number {
    return this.planned.reduce((sum, p, i) => sum + Math.max(0, p - this.allocated[i]), 0);
  }

  /** Moves one attribute's plan; false when nothing moved. */
  stepPlan(attribute: number, delta: number): boolean {
    const was = this.planned[attribute];
    const moved = step(was, this.allocated[attribute], this.caps[attribute], this.left, delta);
    this.planned[attribute] = moved;
    return moved !== was;
  }

  /** C1 DE 01. */
  requestInfo(): void {
    Session.sendToGS(new DataView(Uint8Array.from([0xc1, 4, 0xde, 0x01]).buffer));
  }

  /**
   * C1 DE 02 `[count]` then `[type][points u16 LE]` per attribute: the whole planned allocation
   * (S MessageHandler/SoulPoints/SoulPointSetAllocationsHandlerPlugIn.cs, our BuildSoulPointAllocations).
   */
  invest(): void {
    const bytes = [0xc1, 5 + ATTRIBUTE_COUNT * 3, 0xde, 0x02, ATTRIBUTE_COUNT];
    this.planned.forEach((points, type) => {
      const n = Math.min(0xffff, Math.max(0, points));
      bytes.push(type, n & 0xff, n >> 8);
    });
    Session.sendToGS(new DataView(Uint8Array.from(bytes).buffer));
  }

  /** C1 DE 03 `[payment]` (SoulPointResetHandlerPlugIn.cs). */
  reset(payment: SoulPayment): void {
    this.lastReset = null;
    Session.sendToGS(new DataView(Uint8Array.from([0xc1, 5, 0xde, 0x03, payment]).buffer));
  }
})();
