import { makeAutoObservable, reaction, runInAction } from 'mobx';
import { LocalStorage } from '@/core/localStorage';
import { getUiViewport, onUiViewportChanged } from './components/ui_stage';
import { GameOptions, uiScaleFactor } from '@/controllers/settings';
import { quietUiSounds } from '@/controllers/sound/sfx';
import { AppState } from './uiState';
import { isMobileDevice } from './mobile';

const STORAGE_KEY = 'mu-windows';

type WindowPlacement = {
  x: number | null;
  y: number | null;
  scale: number;
};

export const DEFAULT_SCALE = 1.5;
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

const DEFAULT_SCALES: Record<string, number> = {
  'bottom-bar': 1,
  // Laid out at 760x500 rather than the item window's 190x429, so it opens at
  // its own size instead of the 1.5x every small window wants.
  marketplace: 1,
};

const defaultScaleOf = (id: string): number =>
  DEFAULT_SCALES[id] ?? DEFAULT_SCALE;

/** Our client's panel scale cap (UITransform.cpp): a stage-sized window grows with the screen up to this. */
export const STAGE_SCALE_CAP = 2;

/** At least this many screen pixels of a window stay reachable on every side. */
const EDGE_MARGIN = 32;

/** Screen pixels kept free around a window when fitting its scale to the viewport. */
const FIT_MARGIN = 12;

/**
 * A phone's stage scale floor for the Mu Reforge windows: the 640x480 stage on a phone is about 0.8,
 * which draws their 11 px text at 9. Our Android client lays them out again at 14 dp text; here they
 * are drawn larger (still fitted to the screen), and the shell's scroll where they no longer fit the
 * height (`scrollsOnPhone`).
 */
const PHONE_STAGE_SCALE = 1.3;

/**
 * z-index of the bottom window. Every stacked window sits at base + its
 * position in `order`, so the windows always lie in `[WINDOW_Z_BASE,
 * WINDOW_Z_SHEETS)`. Full-screen sheets (minimap, emote menu, master tree)
 * sit at `WINDOW_Z_SHEETS`, modal prompts at `WINDOW_Z_MODAL`, and the
 * overlays that must never be covered (picked item, tooltips, cursor) at
 * 1000 and up in their own `.less`.
 */
export const WINDOW_Z_BASE = 100;
export const WINDOW_Z_SHEETS = 500;
export const WINDOW_Z_MODAL = 600;

/**
 * What Escape does to a window: close it and return nothing (or `true`), or
 * return `false` to say "nothing to close here, try the window below".
 */
export type WindowCloser = () => boolean | void;

type WindowSize = { width: number; height: number };

/** What `fitScaleOf` measures for a piece that is never stacked: the bar, 640x51 at scale 1. */
const FIXED_SIZES: Record<string, WindowSize> = { 'bottom-bar': { width: 640, height: 51 } };

export const MuWindows = new (class _MuWindows {
  private placements: Record<string, WindowPlacement> = {};
  /** Open windows, bottom to top. */
  order: string[] = [];
  private closers = new Map<string, WindowCloser>();
  /** Closers of the windows the hidden interface unmounted, for `closeAll` (top last). */
  private parked = new Map<string, WindowCloser>();
  private sizes = new Map<string, WindowSize>();
  /** Observable mirror of the stage size, so scales re-fit on resize. */
  private viewport = getUiViewport();
  /** Windows laid out in the 640x480 stage's units (the Mu Reforge shell): drawn at the stage scale. */
  private stageSized = new Set<string>();
  /** Stage-sized windows whose content flows and can scroll on a phone (the shell), not absolutely placed. */
  private stageScrolls = new Set<string>();

  constructor() {
    makeAutoObservable<this, 'stageSized' | 'stageScrolls'>(this, {
      order: true,
      stageSized: false,
      stageScrolls: false,
    });
    this.load();
    // The interface is back: its windows mount and register again.
    reaction(() => AppState.hudHidden, hidden => hidden || this.parked.clear());
    onUiViewportChanged(() => {
      runInAction(() => {
        this.viewport = { ...getUiViewport() };
      });
      this.clampAll();
    });
  }

  placement(id: string): WindowPlacement {
    return (
      this.placements[id] ?? { x: null, y: null, scale: defaultScaleOf(id) }
    );
  }

  /**
   * The largest scale at which the whole window still fits on screen (with
   * `FIT_MARGIN` left on each side). Unknown sizes fit anything.
   */
  fitScaleOf(id: string): number {
    const size = this.sizes.get(id) ?? FIXED_SIZES[id];
    if (!size) return MAX_SCALE;
    const { width, height } = this.viewport;
    const across = (width - FIT_MARGIN * 2) / size.width;
    // A Mu Reforge window on a phone scrolls instead: only its width has to fit.
    const fit = this.scrollsOnPhone(id) ? across : Math.min(across, (height - FIT_MARGIN * 2) / size.height);
    return Math.min(MAX_SCALE, Math.max(fit, 0.25));
  }

  /**
   * Where a window that opens in the middle of the screen goes while it has no saved place: centred
   * at the scale it is drawn at, never above or left of the stage.
   */
  centeredAt(id: string, width: number, height: number): { x: number; y: number } {
    const scale = this.scaleOf(id);
    return {
      x: Math.max(0, Math.round((this.viewport.width - width * scale) / 2)),
      y: Math.max(0, Math.round((this.viewport.height - height * scale) / 2)),
    };
  }

  /**
   * The scale the window is drawn at: the saved scale times the interface
   * scale from the options, capped so the whole window still fits.
   */
  scaleOf(id: string): number {
    const stage = Math.min(this.viewport.scale, STAGE_SCALE_CAP);
    const base = this.stageSized.has(id)
      ? isMobileDevice() ? Math.max(stage, PHONE_STAGE_SCALE) : stage
      : this.placement(id).scale;
    const wanted = base * uiScaleFactor(GameOptions.uiScale);
    return Math.min(wanted, this.fitScaleOf(id));
  }

  /** A stage-sized window whose content flows (the shell), on a phone: as tall as the screen at most, scrolling. */
  scrollsOnPhone(id: string): boolean {
    return this.stageScrolls.has(id) && isMobileDevice();
  }

  /**
   * The tallest a window may be drawn, in its own units: the screen's height on a phone for a window
   * that scrolls there (`scrollsOnPhone`), else unlimited.
   */
  heightCapOf(id: string): number {
    if (!this.scrollsOnPhone(id)) return Infinity;
    return (this.viewport.height - FIT_MARGIN * 2) / this.scaleOf(id);
  }

  /** Every window back to its default corner and size. */
  resetAll(): void {
    runInAction(() => {
      this.placements = {};
    });
    this.save();
  }

  /**
   * `id` is sized in stage units (desktop dp): its scale is the stage's (`min(w/640, h/480)`, capped at
   * `STAGE_SCALE_CAP`) times the interface scale, as our client scales its RmlUi panels, not a saved one.
   */
  sizeToStage(id: string, scrolls = false): void {
    this.stageSized.add(id);
    if (scrolls) this.stageScrolls.add(id);
  }

  // ---- open state ---------------------------------------------------------

  /** Window ids the player has open; a window draws while its id is open. */
  private open: Record<string, boolean> = {};

  isOpen(id: string): boolean {
    return this.open[id] === true;
  }

  setOpen(id: string, value: boolean): void {
    runInAction(() => {
      this.open[id] = value;
    });
  }

  // ---- the stack ----------------------------------------------------------

  /** A window came on screen: it joins the stack on top. */
  register(id: string, size?: WindowSize, onClose?: WindowCloser): void {
    if (size) this.sizes.set(id, size);
    if (onClose) this.closers.set(id, onClose);
    else this.closers.delete(id);
    this.parked.delete(id);
    runInAction(() => {
      if (!this.order.includes(id)) this.order = [...this.order, id];
    });
    this.clamp(id);
  }

  /** `id` is a window that told the stack its size (an item window, a Mu Reforge shell), not the chat or a fan. */
  isSized(id: string): boolean {
    return this.sizes.has(id);
  }

  unregister(id: string): void {
    // Hiding the interface unmounts every window that is still open: keep its closer for `closeAll`.
    const closer = this.closers.get(id);
    if (closer && AppState.hudHidden) this.parked.set(id, closer);
    this.closers.delete(id);
    this.sizes.delete(id);
    runInAction(() => {
      if (this.order.includes(id)) this.order = this.order.filter(w => w !== id);
    });
  }

  /** What Escape would do to `id` (its closer), wherever it is in the stack: a phone's close button. */
  close(id: string): void {
    const closer = this.closers.get(id);
    if (closer) closer();
    else this.setOpen(id, false);
  }

  /** Brings `id` to the top; a click on any window does this. */
  raise(id: string): void {
    const at = this.order.indexOf(id);
    if (at < 0 || at === this.order.length - 1) return;
    runInAction(() => {
      this.order = [...this.order.filter(w => w !== id), id];
    });
  }

  get topId(): string | null {
    return this.order.length ? this.order[this.order.length - 1] : null;
  }

  isTop(id: string): boolean {
    return this.topId === id;
  }

  zIndexOf(id: string): number {
    const at = this.order.indexOf(id);
    return WINDOW_Z_BASE + (at < 0 ? 0 : at + 1);
  }

  /**
   * Escape: closes the topmost window that has something to close. Returns
   * false when the stack is empty or its top has no closer of its own, so
   * the caller can fall back to broadcasting the key.
   */
  closeTop(): boolean {
    for (let i = this.order.length - 1; i >= 0; i--) {
      const closer = this.closers.get(this.order[i]);
      if (!closer) return false;
      if (closer() !== false) return true;
    }
    return false;
  }

  /**
   * `HideAll` (NewUISystem.cpp:1608): every open flag drops, then every stacked window's
   * closer runs, top to bottom (what `Hide` runs: a trade cancel, the vault's close packet),
   * with the interface sounds off; the windows the hidden interface unmounted are reached too.
   */
  closeAll(): void {
    const closers = [...this.order.map(id => this.closers.get(id)), ...this.parked.values()].reverse();
    this.parked.clear();
    runInAction(() => {
      for (const id of Object.keys(this.open)) this.open[id] = false;
    });
    quietUiSounds(() => {
      for (const closer of closers) closer?.();
    });
  }

  // ---- placement ----------------------------------------------------------

  moveTo(id: string, x: number, y: number): void {
    const current = this.placement(id);

    runInAction(() => {
      this.placements[id] = { ...current, ...this.clamped(id, x, y) };
    });

    this.save();
  }

  setScale(id: string, scale: number): void {
    const current = this.placement(id);
    // A viewport smaller than MIN_SCALE * size wins: fitting beats the floor.
    const max = Math.min(MAX_SCALE, this.fitScaleOf(id));
    const min = Math.min(MIN_SCALE, max);

    runInAction(() => {
      this.placements[id] = {
        ...current,
        scale: Math.max(min, Math.min(max, scale)),
      };
    });

    // Growing a window near the right/bottom edge must not push it out.
    this.clamp(id);
    this.save();
  }

  reset(id: string): void {
    runInAction(() => {
      this.placements[id] = { x: null, y: null, scale: defaultScaleOf(id) };
    });

    this.save();
  }

  /**
   * Keeps the whole window inside the viewport when its size is known (the
   * fit-capped scale guarantees it can fit); otherwise keeps the top-left
   * `EDGE_MARGIN` reachable. Restored placements from a bigger monitor and
   * windows left near an edge before a resize both land back in reach.
   */
  private clamped(id: string, x: number, y: number): { x: number; y: number } {
    const { width, height } = this.viewport;
    const size = this.sizes.get(id);
    if (!size) {
      return {
        x: Math.min(Math.max(x, 0), width - EDGE_MARGIN),
        y: Math.min(Math.max(y, 0), height - EDGE_MARGIN),
      };
    }
    const scale = this.scaleOf(id);
    return {
      x: Math.min(Math.max(x, 0), Math.max(0, width - size.width * scale)),
      y: Math.min(Math.max(y, 0), Math.max(0, height - Math.min(size.height, this.heightCapOf(id)) * scale)),
    };
  }

  private clamp(id: string): void {
    const current = this.placements[id];
    if (!current || current.x === null || current.y === null) return;
    const next = this.clamped(id, current.x, current.y);
    if (next.x === current.x && next.y === current.y) return;
    runInAction(() => {
      this.placements[id] = { ...current, ...next };
    });
  }

  private clampAll(): void {
    for (const id of Object.keys(this.placements)) this.clamp(id);
  }

  private load(): void {
    try {
      const raw = LocalStorage.load(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, WindowPlacement>;

      runInAction(() => {
        for (const [id, placement] of Object.entries(parsed)) {
          const scale = Math.max(
            MIN_SCALE,
            Math.min(MAX_SCALE, Number(placement?.scale) || defaultScaleOf(id))
          );
          const free =
            typeof placement?.x === 'number' && typeof placement?.y === 'number';
          this.placements[id] = {
            ...(free
              ? this.clamped(id, placement.x!, placement.y!)
              : { x: null, y: null }),
            scale,
          };
        }
      });
    } catch (err) {
      console.error('Could not read the saved window placements:', err);
    }
  }

  private save(): void {
    LocalStorage.save(STORAGE_KEY, JSON.stringify(this.placements));
  }
})();
