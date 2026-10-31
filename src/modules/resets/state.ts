import { makeAutoObservable } from 'mobx';
import { Session } from '../session';
import { sendChatLine } from '../chat/sendLine';

/** The windows' ids (`versions/shared/ui/windows/reset/window.ts`, `add_stats/window.ts`). */
export const RESET_WINDOW = 'reset';
export const ADD_STATS_WINDOW = 'add_stats';

/** Why a reset or grand reset cannot happen now (S GameLogic/Resets/IResetInfoViewPlugIn.cs `ResetInfoResult`). */
export enum ResetReason {
  Ok = 0,
  FeatureDisabled = 1,
  LevelTooLow = 2,
  LimitReached = 3,
  NotEnoughZen = 4,
  NotEnoughItems = 5,
  NotEnoughResets = 6,
}

/** The outcome of a paid reset (S StatResetResult / MasterResetResult, numbered alike). */
export enum PaidResetResult {
  Success = 0,
  FeatureDisabled = 1,
  InvalidPayment = 2,
  NotAvailable = 3,
  NotInSafezone = 4,
  LevelTooLow = 5,
  NothingToReset = 6,
  NotEnoughWCoin = 7,
  NotEnoughJewels = 8,
  NotEnoughZenOrItems = 9,
  NotMasterClass = 10,
}

/** S GameLogic/Resets/StatResetPayment.cs. */
export enum Payment {
  WCoin = 0,
  Jewels = 1,
}

export type PaidReset = 'stats' | 'master';

export type ResetInfo = { canReset: boolean; reason: ResetReason; requiredLevel: number; requiredZen: number; currentResets: number };
export type GrandResetInfo = ResetInfo & { requiredResets: number; currentGrandResets: number; limit: number };
/** Balances and costs: W Coin, Bless, Soul. */
export type PaidResetInfo = { balances: number[]; costs: number[]; refundable: number; requiredLevel: number; precondition: PaidResetResult };
export type AutoStatSettings = { enabled: boolean; interval: number; percents: number[] };

/** S AutoStatConfiguration Minimum/MaximumInterval; a share is 0..100 %. */
export const MIN_INTERVAL = 1;
export const MAX_INTERVAL = 100;
/** One F3 06 carries a 16-bit amount (CharacterStatIncreasePacketHandlerPlugIn.cs). */
export const MAX_AMOUNT_PER_REQUEST = 65535;

const d9 = (subCode: number, ...data: number[]) => new DataView(Uint8Array.from([0xc1, 4 + data.length, 0xd9, subCode, ...data]).buffer);

/** Whether the payment is covered: the jewel payment needs both jewels (ReforgeResets.cpp `CanAfford`). */
export function canAfford(info: PaidResetInfo, payment: Payment): boolean {
  if (payment === Payment.WCoin) return info.balances[0] >= info.costs[0];
  return info.balances[1] >= info.costs[1] && info.balances[2] >= info.costs[2];
}

/** The server allows it and there is something to refund (`CanReset`). */
export const canPaidReset = (info: PaidResetInfo) => info.precondition === PaidResetResult.Success && info.refundable > 0;

/** The interval in 1..100 and each share in 0..100, as the server reads them back (`Clamped`). */
export function clampAuto(s: AutoStatSettings): AutoStatSettings {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.trunc(v) || 0));
  return { enabled: s.enabled, interval: clamp(s.interval, MIN_INTERVAL, MAX_INTERVAL), percents: s.percents.map(p => clamp(p, 0, 100)) };
}

/** The sum of the shares of the stats the class has (4, or 5 with command). */
export const percentTotal = (s: AutoStatSettings, statCount: number) => s.percents.slice(0, statCount).reduce((a, b) => a + b, 0);

/** The points one stat gets each time the interval comes round, rounded down (`PointsPerTrigger`). */
export const pointsPerTrigger = (perLevel: number, interval: number, percent: number) => Math.floor((perLevel * interval * percent) / 100);

/** The next multiple of the interval above the level (`NextTriggerLevel`). */
export const nextTriggerLevel = (level: number, interval: number) => (Math.floor(level / interval) + 1) * interval;

/**
 * The bulk tab's plan (`PlanBulkAdd`): each typed amount, the "Full" row taking whatever the others
 * leave. More than the free points is `tooMany` and spends nothing.
 */
export function planBulk(typed: number[], fullStat: number, statCount: number, available: number) {
  const amounts = typed.slice(0, statCount).map(v => Math.max(0, Math.trunc(v) || 0));
  if (fullStat >= 0 && fullStat < statCount) {
    amounts[fullStat] = 0;
    amounts[fullStat] = Math.max(0, available - amounts.reduce((a, b) => a + b, 0));
  }
  const total = amounts.reduce((a, b) => a + b, 0);
  const status = available <= 0 ? 'noPoints' : total === 0 ? 'empty' : total > available ? 'tooMany' : 'ready';
  return { amounts, total, status } as const;
}

/**
 * Our client's Reset window, paid reset dialog and Add Stats window state (UI/Reset/, UI/Character/
 * AddStatsWindow.cpp) without their drawing: what the server answered on D9 01-07.
 */
export const Resets = new (class {
  reset: ResetInfo | null = null;
  grand: GrandResetInfo | null = null;
  paid: Record<PaidReset, PaidResetInfo | null> = { stats: null, master: null };
  /** The last refusal of a paid reset, for the window's message line. */
  paidResult: { reset: PaidReset; result: PaidResetResult } | null = null;
  /** The server's stored auto stat settings, null until it answered D9 07. */
  auto: AutoStatSettings | null = null;
  pointsPerLevelUp = 0;
  /**
   * Which reset the Reset window shows: it holds one at a time (ResetWindow.cpp `m_Kind`). The
   * character window opens it on the button that was clicked; any other open is the character reset.
   */
  showGrand = false;

  constructor() {
    makeAutoObservable(this);
  }

  setReset(info: ResetInfo): void {
    this.reset = info;
  }

  setGrand(info: GrandResetInfo): void {
    this.grand = info;
  }

  setPaid(reset: PaidReset, info: PaidResetInfo): void {
    this.paid[reset] = info;
  }

  setAuto(settings: AutoStatSettings, pointsPerLevelUp: number): void {
    this.auto = settings;
    this.pointsPerLevelUp = pointsPerLevelUp;
  }

  setShowGrand(grand: boolean): void {
    this.showGrand = grand;
  }

  /**
   * On every open of the Reset window: level, Zen and resets change while it is closed. `grand`
   * asks for that reset only (`RequestInfo`, the window shows one); left out, both.
   */
  requestInfo(grand?: boolean): void {
    this.reset = null;
    this.grand = null;
    if (grand !== true) Session.sendToGS(d9(0x01));
    if (grand !== false) Session.sendToGS(d9(0x02));
  }

  /** The window's Reset / Grand Reset: our server takes them as chat commands (ResetRequests.cpp). */
  doReset(grand: boolean): void {
    sendChatLine(grand ? '/grandreset' : '/reset');
  }

  /** D9 03 / D9 05: the price list of a paid reset. */
  requestPaid(reset: PaidReset): void {
    this.paid[reset] = null;
    this.paidResult = null;
    Session.sendToGS(d9(reset === 'stats' ? 0x03 : 0x05));
  }

  /** D9 04 / D9 06 `[payment]` (StatResetHandlerPlugIn.cs, MasterResetHandlerPlugIn.cs). */
  payPaid(reset: PaidReset, payment: Payment): void {
    Session.sendToGS(d9(reset === 'stats' ? 0x04 : 0x06, payment));
  }

  paidAnswered(reset: PaidReset, result: PaidResetResult): void {
    this.paidResult = { reset, result };
    // A success is followed by a fresh price list (stats) or nothing (master): ask again.
    if (result === PaidResetResult.Success) this.requestPaid(reset);
  }

  /** D9 07: the stored auto stat settings. */
  requestAuto(): void {
    Session.sendToGS(d9(0x07));
  }

  /** D9 08 `[enabled][interval][5 shares]` (AutoStatConfigurationSaveHandlerPlugIn.cs); the server echoes D9 07. */
  saveAuto(settings: AutoStatSettings): void {
    const s = clampAuto(settings);
    Session.sendToGS(d9(0x08, s.enabled ? 1 : 0, s.interval, ...s.percents.slice(0, 5)));
  }

  /**
   * F3 06 with our 16-bit amount (big endian at 5): the server adds that many points in one go
   * (CharacterStatIncreasePacketHandlerPlugIn.cs); the answer is the hero's own F3 06 Extended.
   */
  addPoints(stat: number, amount: number): void {
    const n = Math.min(MAX_AMOUNT_PER_REQUEST, Math.trunc(amount));
    if (n <= 0) return;
    Session.sendToGS(new DataView(Uint8Array.from([0xc1, 7, 0xf3, 0x06, stat, n >> 8, n & 0xff]).buffer));
  }
})();
