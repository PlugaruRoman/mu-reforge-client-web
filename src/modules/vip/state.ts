import { makeAutoObservable } from 'mobx';
import { Session } from '../session';

/** The window's id (`versions/shared/ui/windows/vip_shop/window.ts`). */
export const VIP_WINDOW = 'vip_shop';

/** Experience, Drop, Craft, All Inclusive; the server's VipType is the index + 1 (S DataModel/Entities/VipType.cs). */
export const TIER_COUNT = 4;
export const ALL_INCLUSIVE = 3;
export const DURATION_DAYS = 30;
const SINGLE_TIERS = [0, 1, 2];

/** The server's VipBuyResult (S GameLogic/Vip/VipBuyResult.cs). */
export enum VipBuyResult {
  Success = 0,
  InvalidTier = 1,
  NotEnoughMoney = 2,
  Conflict = 3,
  Error = 4,
}

/** A purchase without an answer frees the buttons again after this (VipShopWindow.cpp BuyAnswerTimeoutMs). */
const BUY_TIMEOUT_MS = 5000;

/**
 * Our client's `GameLogic::Reforge::Vip` (GameLogic/Reforge/ReforgeVip.cpp): the account's tiers as
 * the server reports them (D7 01 / 02) and the shop's rules. The single tiers stack, each on its own
 * clock; All Inclusive holds them all, and a single tier cannot be bought while it runs.
 */
export const Vip = new (class {
  /** Seconds left of each tier at `receivedAt`. */
  remaining: number[] = [0, 0, 0, 0];
  /** W Coin (C) per tier; 0 until the first status. */
  prices: number[] = [0, 0, 0, 0];
  wcoin = 0;
  receivedAt = 0;
  /** A purchase is on its way: when it was sent, 0 for none. */
  buySentAt = 0;
  /** The last purchase answer, for the window's message line. */
  answer: { result: VipBuyResult; at: number } | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /** D7 01: times, balance and prices. */
  setStatus(remaining: number[], wcoin: number, prices: number[], now = Date.now()): void {
    this.remaining = remaining;
    this.wcoin = wcoin;
    this.prices = prices;
    this.receivedAt = now;
  }

  /** D7 02: the times and the balance (no prices), and the result. */
  setBuyResult(result: VipBuyResult, remaining: number[], wcoin: number, now = Date.now()): void {
    this.remaining = remaining;
    this.wcoin = wcoin;
    this.receivedAt = now;
    this.buySentAt = 0;
    this.answer = { result, at: now };
  }

  /** Seconds left of the tier at `now`, counted down from the report. */
  remainingAt(tier: number, now = Date.now()): number {
    const elapsed = Math.max(0, Math.floor((now - this.receivedAt) / 1000));
    return Math.max(0, (this.remaining[tier] ?? 0) - elapsed);
  }

  isActive(tier: number, now = Date.now()): boolean {
    return this.remainingAt(tier, now) > 0;
  }

  /** Not blocked by a running All Inclusive. */
  isBuyable(tier: number, now = Date.now()): boolean {
    return tier === ALL_INCLUSIVE || !this.isActive(ALL_INCLUSIVE, now);
  }

  priceKnown(tier: number): boolean {
    return (this.prices[tier] ?? 0) > 0;
  }

  canAfford(tier: number): boolean {
    return this.priceKnown(tier) && this.wcoin >= this.prices[tier];
  }

  /** W Coin the bundle saves against the three single tiers; 0 while a price is unknown. */
  get bundleSavings(): number {
    if (!SINGLE_TIERS.every(tier => this.priceKnown(tier))) return 0;
    const singles = SINGLE_TIERS.reduce((sum, tier) => sum + this.prices[tier], 0);
    const bundle = this.prices[ALL_INCLUSIVE];
    return bundle > 0 && singles > bundle ? singles - bundle : 0;
  }

  /** Buying All Inclusive while single tiers run replaces them. */
  replacesSingles(tier: number, now = Date.now()): boolean {
    return tier === ALL_INCLUSIVE && SINGLE_TIERS.some(t => this.isActive(t, now));
  }

  /** Why the tier cannot be bought now, or null (`RefusalReason`). */
  refusal(tier: number, now = Date.now()): 'included' | 'loading' | 'wcoin' | null {
    if (!this.isBuyable(tier, now)) return 'included';
    if (!this.priceKnown(tier)) return 'loading';
    if (!this.canAfford(tier)) return 'wcoin';
    return null;
  }

  get buyPending(): boolean {
    return this.buySentAt > 0 && Date.now() - this.buySentAt < BUY_TIMEOUT_MS;
  }

  /** C1 D7 01 (S MessageHandler/Vip/VipInfoRequestHandlerPlugIn.cs). */
  requestStatus(): void {
    Session.sendToGS(new DataView(Uint8Array.from([0xc1, 4, 0xd7, 0x01]).buffer));
  }

  /** C1 D7 02 `[tier]`, the server's VipType (index + 1) at 4 (VipBuyRequestHandlerPlugIn.cs). */
  buy(tier: number): void {
    if (tier < 0 || tier >= TIER_COUNT || this.buyPending) return;
    this.buySentAt = Date.now();
    this.answer = null;
    Session.sendToGS(new DataView(Uint8Array.from([0xc1, 5, 0xd7, 0x02, tier + 1]).buffer));
  }
})();
