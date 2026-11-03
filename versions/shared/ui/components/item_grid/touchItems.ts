import { Bag } from '@/modules/inventory';

/**
 * Items by finger, on a phone (the grids are written for a mouse: a press picks the item up, the
 * hover draws its tooltip). A finger on an item is held back until it is clear what it means:
 * - a tap picks the item up (the press is replayed where it landed), a second tap places it;
 * - a long press shows the item's tooltip (a replayed hover) until the finger lifts;
 * - a drag picks it up and lets it go over the square the finger leaves it on. Let go anywhere but
 *   an item area, it stays carried: a finger never drops an item on the ground by sliding off.
 */

/** Where items sit: the bag grids, the shop and guild bank grids, the equipment squares. */
const ITEM_AREAS = '.mu-item-grid, .inventory-items, .shop-items, .gb-grid, .equipment-slot';
const LONG_PRESS_MS = 450;
/** Pixels a finger may wander before a press is a drag. */
const SLOP = 10;

type Press = { id: number; x: number; y: number; target: Element; timer: number; mode: 'wait' | 'tip' | 'drag' };

/** Events this file made: they pass through to the grids. */
const replayed = new WeakSet<Event>();

function replay(type: string, target: Element, x: number, y: number, id: number, related?: Element): void {
  const init: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    pointerId: id,
    pointerType: 'touch',
    isPrimary: true,
    button: type === 'pointerdown' || type === 'pointerup' ? 0 : -1,
    buttons: type === 'pointerdown' || type === 'pointermove' ? 1 : 0,
    relatedTarget: related ?? null,
  };
  const event = new PointerEvent(type, init);
  replayed.add(event);
  target.dispatchEvent(event);
}

const itemAreaAt = (x: number, y: number): Element | null =>
  document.elementFromPoint(x, y)?.closest(ITEM_AREAS) ?? null;

/** Installs the gestures (capture listeners on the window); returns the uninstall. */
export function installTouchItemGestures(): () => void {
  let press: Press | null = null;

  const tap = (target: Element, x: number, y: number, id: number) => {
    replay('pointerdown', target, x, y, id);
    replay('pointerup', target, x, y, id);
  };

  const down = (e: PointerEvent) => {
    if (replayed.has(e) || e.pointerType !== 'touch' || press) return;
    const area = (e.target as Element | null)?.closest?.(ITEM_AREAS);
    // Carrying an item, a tap places it at once.
    if (!area || Bag.pickedItem) return;
    e.stopPropagation();
    const held: Press = { id: e.pointerId, x: e.clientX, y: e.clientY, target: e.target as Element, timer: 0, mode: 'wait' };
    held.timer = window.setTimeout(() => {
      if (press !== held) return;
      held.mode = 'tip';
      replay('pointerover', held.target, held.x, held.y, held.id, document.body);
      replay('pointermove', held.target, held.x, held.y, held.id);
    }, LONG_PRESS_MS);
    press = held;
  };

  const move = (e: PointerEvent) => {
    if (replayed.has(e) || !press || e.pointerId !== press.id) return;
    if (press.mode === 'wait' && Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP) {
      window.clearTimeout(press.timer);
      press.mode = 'drag';
      tap(press.target, press.x, press.y, press.id);
    }
    // The tip stays on its item; a carried item follows the finger (the replays reach the grids).
    if (press.mode === 'tip') e.stopPropagation();
  };

  const up = (e: PointerEvent) => {
    if (replayed.has(e) || !press || e.pointerId !== press.id) return;
    const held = press;
    press = null;
    window.clearTimeout(held.timer);
    e.stopPropagation();
    if (held.mode === 'wait') {
      tap(held.target, held.x, held.y, held.id);
    } else if (held.mode === 'tip') {
      replay('pointerout', held.target, held.x, held.y, held.id, document.body);
    } else if (Bag.pickedItem) {
      const area = itemAreaAt(e.clientX, e.clientY);
      if (area) tap(document.elementFromPoint(e.clientX, e.clientY) ?? area, e.clientX, e.clientY, held.id);
    }
  };

  /** The press ends with nothing done: the tooltip goes, a carried item stays carried. */
  const drop = () => {
    if (!press) return;
    window.clearTimeout(press.timer);
    if (press.mode === 'tip') replay('pointerout', press.target, press.x, press.y, press.id, document.body);
    press = null;
  };

  const cancel = (e: PointerEvent) => {
    if (press && e.pointerId === press.id) drop();
  };

  // The page lost the finger (blur, hidden tab) with no pointerup: a press left open would turn
  // every later touch on an item away (`down` takes one finger at a time).
  const hidden = () => {
    if (document.visibilityState === 'hidden') drop();
  };

  window.addEventListener('pointerdown', down, true);
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', cancel, true);
  window.addEventListener('blur', drop);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    drop();
    window.removeEventListener('blur', drop);
    document.removeEventListener('visibilitychange', hidden);
    window.removeEventListener('pointerdown', down, true);
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', cancel, true);
  };
}
