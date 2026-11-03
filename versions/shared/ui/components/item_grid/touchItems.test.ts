import { beforeEach, describe, expect, it, vi } from 'vitest';

const bag = vi.hoisted(() => ({ pickedItem: null as unknown }));
vi.mock('@/modules/inventory', () => ({ Bag: bag }));

type Handler = (e: Record<string, unknown>) => void;
const handlers: Record<string, Handler> = {};
vi.stubGlobal('window', {
  addEventListener: (type: string, fn: Handler) => (handlers[type] = fn),
  removeEventListener: () => {},
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (id: number) => clearTimeout(id),
});
vi.stubGlobal(
  'PointerEvent',
  class {
    type: string;
    constructor(type: string, init: object) {
      this.type = type;
      Object.assign(this, init);
    }
  }
);

const seen: string[] = [];
const item = { closest: () => item, dispatchEvent: (e: { type: string }) => seen.push(e.type) };
const page = {
  body: {},
  visibilityState: 'visible',
  elementFromPoint: () => item,
  addEventListener: (type: string, fn: Handler) => (handlers[`document:${type}`] = fn),
  removeEventListener: () => {},
};
vi.stubGlobal('document', page);

const { installTouchItemGestures } = await import('./touchItems');
installTouchItemGestures();

const finger = (type: string, x = 10, y = 10) => {
  const e = { type, pointerType: 'touch', pointerId: 1, target: item, clientX: x, clientY: y, stopPropagation: vi.fn() };
  handlers[type](e);
  return e;
};

describe('items by finger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    seen.length = 0;
    bag.pickedItem = null;
  });

  it('holds the press back and replays it as a tap on release', () => {
    expect(finger('pointerdown').stopPropagation).toHaveBeenCalled();
    expect(seen).toEqual([]);
    finger('pointerup');
    expect(seen).toEqual(['pointerdown', 'pointerup']);
  });

  it('shows the tooltip on a long press and hides it on release, picking nothing up', () => {
    finger('pointerdown');
    vi.advanceTimersByTime(500);
    expect(seen).toEqual(['pointerover', 'pointermove']);
    finger('pointerup');
    expect(seen).toEqual(['pointerover', 'pointermove', 'pointerout']);
  });

  it('picks the item up as the finger drags it', () => {
    finger('pointerdown');
    finger('pointermove', 40, 10);
    expect(seen).toEqual(['pointerdown', 'pointerup']);
  });

  it('forgets a press the page lost without a pointerup (hidden tab, blur)', () => {
    finger('pointerdown');
    page.visibilityState = 'hidden';
    handlers['document:visibilitychange']({});
    page.visibilityState = 'visible';
    // The next touch is a new press, not a second finger turned away.
    expect(finger('pointerdown').stopPropagation).toHaveBeenCalled();
    finger('pointerup');
    expect(seen).toEqual(['pointerdown', 'pointerup']);

    seen.length = 0;
    finger('pointerdown');
    vi.advanceTimersByTime(500);
    handlers.blur({});
    expect(seen).toEqual(['pointerover', 'pointermove', 'pointerout']);
    expect(finger('pointerdown').stopPropagation).toHaveBeenCalled();
    finger('pointerup');
  });

  it('lets a press through while an item is carried (the tap places it)', () => {
    bag.pickedItem = {};
    expect(finger('pointerdown').stopPropagation).not.toHaveBeenCalled();
    finger('pointerup');
  });
});
