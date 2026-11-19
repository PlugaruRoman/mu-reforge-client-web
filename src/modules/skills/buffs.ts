/**
 * Active buffs / debuffs of the hero with the moment each one arrived.
 *
 * Driven by `HeroSkills.buffs` (MagicEffectStatus 0x07 / MagicEffectCancelled,
 * `net.ts`): a MobX reaction stamps every newly present effect id with the
 * layer clock. The remaining time is only ever the server's: an item effect's 0x2D (`setBuffTime`)
 * and, for every effect of the hero, our server's C1 ED 02 (`setBuffValues`), which also carries what
 * the effect adds for the tip. No formula of the client guesses a time.
 *
 * Read by the buff bar (`versions/shared/ui/hud/buff_bar`) through `skills.activeBuffs`
 * / `skills.buffRemaining`, and by the usability rules (`usability.ts`).
 */
import { reaction } from 'mobx';
import type { ENUM_WORLD } from '../../core/types';
import type { SkillLayer } from './layer';
import { buffRecipe, type BuffKind } from './recipes';
import { HeroSkills } from './state';
import { Hero } from '../hero';
import { Session } from '../session';
import { MagicEffectCancelRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import type { BuffValue } from '@versions/reforge/packets/buffValues';

// ---- 1. tuning -------------------------------------------------------------

// Nothing to tune: the clock is the frame clock and durations are recipes.

// ---- 2. state + readers ----------------------------------------------------

export interface ActiveBuff {
  id: number;
  name: string;
  kind: BuffKind;
  /** Layer-clock seconds when the effect appeared. */
  startedAt: number;
}

/** Seconds of `update` since the last reset - the layer's own clock. */
let clock = 0;
/** Effect id → clock seconds when it appeared. */
const startedAt = new Map<number, number>();
/** Effect id → clock seconds when it runs out, for the effects whose time the server sent (0x2D, ED 02). */
const endsAt = new Map<number, number>();
/** Effect id → what it adds, as our server computed it (ED 02). */
const values = new Map<number, readonly BuffValue[]>();

/** `RegisterBuff(type, Hero, time)` (WSclient.cpp:10265): the server's remaining seconds for an effect. */
export function setBuffTime(effectId: number, seconds: number): void {
  if (seconds > 0) endsAt.set(effectId, clock + seconds);
}

/**
 * C1 ED 02: the effect's real remaining time - 0 when it has no countdown (a fortress owner's buff, the GM
 * mark), which drops any time it had - and what it adds.
 */
export function setBuffValues(effectId: number, seconds: number, effectValues: readonly BuffValue[]): void {
  if (seconds > 0) endsAt.set(effectId, clock + seconds);
  else endsAt.delete(effectId);
  if (effectValues.length > 0) values.set(effectId, effectValues);
  else values.delete(effectId);
}

/** What the effect adds, empty when the server sent nothing. */
export function buffValues(effectId: number): readonly BuffValue[] {
  return values.get(effectId) ?? [];
}

function noteBuffs(ids: readonly number[] | undefined): void {
  // Defensive: a reaction whose expression threw hands over `undefined`.
  if (!ids) return;
  for (const id of ids) if (!startedAt.has(id)) startedAt.set(id, clock);
  for (const id of Array.from(startedAt.keys())) {
    if (!ids.includes(id)) startedAt.delete(id);
  }
  for (const id of Array.from(endsAt.keys())) {
    if (!ids.includes(id)) endsAt.delete(id);
  }
  for (const id of Array.from(values.keys())) {
    if (!ids.includes(id)) values.delete(id);
  }
}

/** Disposer of the `HeroSkills.buffs` reaction once it is running. */
let stopWatching: (() => void) | null = null;

/**
 * Start following `HeroSkills.buffs`, on the first `update` (by the first frame every module has
 * finished evaluating). `buffs` is replaced wholesale on every change, so the reaction fires
 * once per packet; `fireImmediately` catches a hero that logged in buffed.
 */
function ensureWatching(): void {
  if (stopWatching) return;
  stopWatching = reaction(() => HeroSkills.buffs, noteBuffs, { fireImmediately: true });
}

/**
 * The hero's effects in the original's bar order (`CNewUIBuffWindow::
 * BuffSort`): buffs first, newest leftmost; debuffs after, oldest first.
 */
export function activeBuffs(): ActiveBuff[] {
  const buffs: ActiveBuff[] = [];
  const debuffs: ActiveBuff[] = [];
  for (const id of HeroSkills.buffs) {
    const recipe = buffRecipe(id);
    const entry: ActiveBuff = {
      id,
      name: recipe.name,
      kind: recipe.kind,
      startedAt: startedAt.get(id) ?? clock,
    };
    if (recipe.kind === 'debuff') debuffs.push(entry);
    else buffs.unshift(entry);
  }
  return buffs.concat(debuffs);
}

/** eBuff_InfinityArrow and eBuff_SwellOfMagicPower: the only effects a right click cancels, by their skill (NewUIBuffWindow.cpp:240-253). */
const CANCEL_SKILL: Readonly<Record<number, number>> = { 6: 77, 82: 233 };

export function buffCancelSkill(effectId: number): number | null {
  return CANCEL_SKILL[effectId] ?? null;
}

/** The cancel box's Ok (NewUICommonMessageBox.cpp:1524-1533): the base skill and the hero. */
export function cancelBuff(skill: number): void {
  const packet = MagicEffectCancelRequestPacket.createPacket();
  packet.SkillId = skill;
  packet.PlayerId = Hero.playerId ?? 0;
  Session.sendToGS(packet.buffer);
}

/** Whether the hero currently carries this effect. */
export function hasBuff(effectId: number): boolean {
  return HeroSkills.buffs.includes(effectId);
}

/** Seconds until the effect runs out as the server told, or `null` when it has no countdown. */
export function buffRemaining(effectId: number): number | null {
  const end = endsAt.get(effectId);
  return end === undefined ? null : Math.max(0, end - clock);
}

function update(_map: ENUM_WORLD, dt: number): void {
  ensureWatching();
  clock += dt;
}

function reset(): void {
  // The buffs themselves survive a warp (the server re-sends nothing), so
  // their start stamps do too; only the clock is rebased.
  const now = clock;
  for (const [id, at] of startedAt) startedAt.set(id, at - now);
  for (const [id, at] of endsAt) endsAt.set(id, at - now);
  clock = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const buffsLayer: SkillLayer = {
  name: 'buffs',
  update,
  reset,
};
