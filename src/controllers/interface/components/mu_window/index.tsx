import './style.less';
import { createContext, useCallback, useContext, useEffect, type CSSProperties } from 'react';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { MuSpriteFrame, useMuSprite } from '../mu_sprite';
import { MuResizeGrip, useWindowChrome } from './useWindowChrome';
import { MuWindows, type WindowCloser } from '../../windowManager';
import { useUiViewport } from '../ui_stage';
import { isMobileDevice } from '../../mobile';
import { t } from '@/i18n';

const BACK_SPRITE = 'newui_msgbox_back.OZJ';
const TOP_SPRITE = 'newui_item_back04.OZT';
const LEFT_SPRITE = 'newui_item_back02-L.OZT';
const RIGHT_SPRITE = 'newui_item_back02-R.OZT';
const BOTTOM_SPRITE = 'newui_item_back03.OZT';

export const WINDOW_WIDTH = 190;
export const WINDOW_HEIGHT = 429;

const TOP_HEIGHT = 64;
const SIDE_WIDTH = 21;
const SIDE_HEIGHT = 320;
const BOTTOM_HEIGHT = 45;

// The main bar's height in 640x480 units; the bar is scaled by the player, so
// every window that rides on it (the original's `480 - 51 - h`) follows the
// bar's on-screen height, not the constant.
const BOTTOM_BAR_HEIGHT = 51;
export const BOTTOM_BAR_ID = 'bottom-bar';
// A phone hides the bar (the touch HUD takes its place), so nothing rides on it there.
export const bottomBarScreenHeight = () => (isMobileDevice() ? 0 : BOTTOM_BAR_HEIGHT * MuWindows.scaleOf(BOTTOM_BAR_ID));

/**
 * The classic windows that are open, by id, with the column they dock to. A window the player
 * dragged away is in it too; `docked` tells them apart.
 */
const dockedColumns = observable.map<string, number>();

/** A phone: the drawn width of each open classic window, for laying them side by side in the middle. */
const dockedWidths = observable.map<string, number>();

/**
 * A phone's docking (our Android client's `.dock-mobile`, workspace.rcss): the docked windows stand
 * side by side in the middle of the screen, in their columns' order from the right. Returns the
 * window's distance from the right edge.
 */
function phoneRight(id: string, column: number, width: number, viewportWidth: number): number {
  let total = 0;
  let before = 0;
  for (const [other, otherWidth] of dockedWidths) {
    if (other !== id && !docked(other)) continue;
    total += otherWidth;
    const otherColumn = dockedColumns.get(other) ?? 0;
    if (other !== id && (otherColumn < column || (otherColumn === column && MuWindows.order.indexOf(other) < MuWindows.order.indexOf(id)))) {
      before += otherWidth;
    }
  }
  const start = Math.max(0, (viewportWidth - total) / 2);
  return Math.max(0, Math.min(start + before, viewportWidth - width));
}

/** Opened within this long of each other, two windows came together (a vault and its inventory). */
const OPENED_TOGETHER_MS = 500;
const openedAt = new Map<string, number>();

/**
 * One window at a time where two cannot fit: on a phone, a classic window that opens past the screen's
 * width closes the oldest docked ones until it fits - never one that opened with it.
 */
function makeRoomOnPhone(id: string, viewportWidth: number): void {
  const now = performance.now();
  openedAt.set(id, now);
  const total = () => [...dockedWidths].reduce((sum, [other, w]) => sum + (other === id || docked(other) ? w : 0), 0);
  for (const other of MuWindows.order) {
    if (total() <= viewportWidth) return;
    if (other === id || !dockedWidths.has(other) || !docked(other)) continue;
    if (now - (openedAt.get(other) ?? 0) < OPENED_TOGETHER_MS) continue;
    MuWindows.close(other);
    runInAction(() => void dockedWidths.delete(other));
  }
}

/** True while a classic window is docked on the right edge (never dragged): our client hides the
 * HUD pieces in that corner then (ReforgeMenuLauncher.cpp, `IsWorldCoveredFromRight`). */
export function worldCoveredFromRight(): boolean {
  for (const id of dockedColumns.keys()) if (docked(id)) return true;
  return false;
}

/** The classic window a piece is drawn in (MuItemWindow provides it). */
const ItemWindowContext = createContext<string | null>(null);

export function useItemWindowId(): string | null {
  return useContext(ItemWindowContext);
}

/** Docked windows with plates hanging off their left edge, by id: how many plates each shows. */
const plateOwners = observable.map<string, number>();

/** A side plate of `id` came on screen; the returned function takes it off again. */
export function addSidePlate(id: string): () => void {
  runInAction(() => plateOwners.set(id, (plateOwners.get(id) ?? 0) + 1));
  return () =>
    runInAction(() => {
      const left = (plateOwners.get(id) ?? 1) - 1;
      if (left > 0) plateOwners.set(id, left);
      else plateOwners.delete(id);
    });
}

/** One column of plates: a 36 wide plate and the 8 between it and what it hangs off. */
export const SIDE_PLATE_PITCH = 44;
const PLATE_SIZE = 36;

/**
 * Where the plates hanging off docked window `id` go, in its logical pixels: `-44`, off its own left
 * edge, while nothing is docked left of it; otherwise out past the whole dock, so they never cover
 * the windows beside it (the character window's plates used to sit on the inventory's grid and its
 * Expand button). Each window's plates keep their own column there, the window nearest the dock's
 * outer edge innermost, so the inventory's column and the character's never land on one another.
 * A window dragged to the screen's left edge gets them on its right side.
 */
export function sidePlateLeft(id: string): number {
  const column = dockedColumns.get(id);
  if (column === undefined || !docked(id)) {
    // Dragged against the screen's left edge, the plates would hang off it: they go to its right.
    const { x } = MuWindows.placement(id);
    return x !== null && x < SIDE_PLATE_PITCH * MuWindows.scaleOf(id) ? WINDOW_WIDTH + SIDE_PLATE_PITCH - PLATE_SIZE : -SIDE_PLATE_PITCH;
  }
  let outer = column;
  let plateColumns = 0;
  for (const [other, otherColumn] of dockedColumns) {
    if (other === id || otherColumn <= column || !docked(other)) continue;
    outer = Math.max(outer, otherColumn);
    if (plateOwners.has(other)) plateColumns++;
  }
  return -SIDE_PLATE_PITCH * (plateColumns + 1) - (outer - column) * WINDOW_WIDTH;
}

/**
 * The order the open classic windows pack in from the right edge, with no gap, or null (the default)
 * for each window's own fixed column. A version that docks like our client's workspace sets it
 * (versions/shared/ui/windows/_shared/dockOrder.ts); a window not in it keeps the column it asks for.
 */
let dockOrder: readonly string[] | null = null;

export function setDockOrder(order: readonly string[] | null): void {
  dockOrder = order;
}

/** The column `id` packs to, or undefined when it does not take part in the packing. */
function packedColumn(id: string): number | undefined {
  const at = dockOrder?.indexOf(id) ?? -1;
  if (!dockOrder || at < 0) return undefined;
  let column = 0;
  for (let i = 0; i < at; i++) {
    const other = dockOrder[i];
    if (dockedColumns.has(other) && docked(other)) column++;
  }
  return column;
}

/** Still on its column: never dragged (useWindowChrome's `anchored`). */
function docked(id: string): boolean {
  const { x, y } = MuWindows.placement(id);
  return x === null || y === null;
}

/** The classic column art (`RenderFrame`): top, sides and bottom over the message box fill. */
const ColumnArt = observer(() => (
  <>
    <MuSpriteFrame
      file={TOP_SPRITE}
      width={WINDOW_WIDTH}
      height={TOP_HEIGHT}
      style={{ position: 'absolute', left: 0, top: 0 }}
    />
    <MuSpriteFrame
      file={LEFT_SPRITE}
      width={SIDE_WIDTH}
      height={SIDE_HEIGHT}
      style={{ position: 'absolute', left: 0, top: TOP_HEIGHT }}
    />
    <MuSpriteFrame
      file={RIGHT_SPRITE}
      width={SIDE_WIDTH}
      height={SIDE_HEIGHT}
      style={{
        position: 'absolute',
        left: WINDOW_WIDTH - SIDE_WIDTH,
        top: TOP_HEIGHT,
      }}
    />
    <MuSpriteFrame
      file={BOTTOM_SPRITE}
      width={WINDOW_WIDTH}
      height={BOTTOM_HEIGHT}
      style={{
        position: 'absolute',
        left: 0,
        top: WINDOW_HEIGHT - BOTTOM_HEIGHT,
      }}
    />
  </>
));

type MuItemWindowProps = {
  id: string;
  column?: number;
  /**
   * The window's size on a phone when it lays itself out again there (the inventory: wide and low,
   * as our Android client's mobile my_inventory.rcss). It draws on a flat dark plate with a gold rim
   * instead of the column art (`.phone-plate`).
   */
  phoneSize?: { width: number; height: number };
  className?: string;
  style?: CSSProperties;
  /** Read by screen readers; defaults to the id. */
  label?: string;
  /**
   * Escape while this is the top window. Without one, Escape falls back to
   * the `keyPressed` broadcast, which closes every window listening for it.
   */
  onClose?: WindowCloser;
  children?: React.ReactNode;
};

export const MuItemWindow = observer(
  ({ id, column: askedColumn = 0, phoneSize, className, style, label, onClose, children }: MuItemWindowProps) => {
    const column = packedColumn(id) ?? askedColumn;
    const back = useMuSprite(BACK_SPRITE);
    const phone = isMobileDevice();
    const plate = phone && !!phoneSize;
    const width = plate ? phoneSize.width : WINDOW_WIDTH;
    const height = plate ? phoneSize.height : WINDOW_HEIGHT;
    const chrome = useWindowChrome(id, {
      width,
      height,
      onClose,
    });
    const stackRef = chrome.ref as (el: HTMLElement | null) => void;
    useEffect(() => {
      runInAction(() => dockedColumns.set(id, column));
      return () => runInAction(() => void dockedColumns.delete(id));
    }, [id, column]);
    // Docked, a column or the bar may not push the window off a small screen (a phone): the
    // fit-capped scale makes it fit, so it slides left / down over the bar until it does.
    const viewport = useUiViewport();
    const drawnWidth = width * chrome.scale;
    useEffect(() => {
      if (!phone) return;
      runInAction(() => dockedWidths.set(id, drawnWidth));
    }, [phone, id, drawnWidth]);
    useEffect(() => {
      if (!phone) return;
      makeRoomOnPhone(id, viewport.width);
      return () => {
        openedAt.delete(id);
        runInAction(() => void dockedWidths.delete(id));
      };
      // Once, as it opens: a later resize only re-centres.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phone, id]);
    const right = phone
      ? phoneRight(id, column, drawnWidth, viewport.width)
      : Math.max(0, Math.min(column * drawnWidth, viewport.width - drawnWidth));
    const bottom = phone
      ? Math.max(0, (viewport.height - height * chrome.scale) / 2)
      : Math.max(0, Math.min(bottomBarScreenHeight(), viewport.height - WINDOW_HEIGHT * chrome.scale));
    // Joins the stack and takes the focus, so the window is the keyboard's
    // target the moment it opens (and Escape scopes to it).
    const ref = useCallback(
      (el: HTMLDivElement | null) => {
        stackRef(el);
        if (el) el.focus({ preventScroll: true });
      },
      [stackRef]
    );

    return (
      <div
        ref={ref}
        role="dialog"
        aria-label={label ?? id.replace(/-/g, ' ')}
        tabIndex={-1}
        className={`mu-item-window${plate ? ' phone-plate' : ''}${className ? ` ${className}` : ''}`}
        onPointerDown={chrome.onPointerDown}
        style={{
          right,
          bottom,
          backgroundImage: back && !plate ? `url(${back.url})` : undefined,
          backgroundSize: '100% 100%',
          ...chrome.style,
          ...style,
        }}
      >
      {!plate && <ColumnArt />}
        <ItemWindowContext.Provider value={id}>{children}</ItemWindowContext.Provider>
        {phone ? (
          <PhoneClose scale={chrome.scale} onClose={() => MuWindows.close(id)} />
        ) : (
          <MuResizeGrip id={id} width={WINDOW_WIDTH} />
        )}
      </div>
    );
  }
);

/** A phone's close button, this many screen pixels square: one big target in the top right corner. */
const PHONE_CLOSE_PX = 40;

/**
 * The close button a window gets on a phone (our Android client's `mobile-close` corner button): the
 * art's own close buttons are 16 px there. Sized in screen pixels whatever the window's scale;
 * nothing on a desktop.
 */
export const PhoneClose = observer(({ scale, onClose }: { scale: number; onClose: () => void }) =>
  !isMobileDevice() ? null : (
  <div
    className="mu-phone-close"
    role="button"
    aria-label={t('common.close')}
    data-no-drag="true"
    style={{ width: PHONE_CLOSE_PX / scale, height: PHONE_CLOSE_PX / scale }}
    onPointerDown={e => e.stopPropagation()}
    onClick={e => {
      e.stopPropagation();
      onClose();
    }}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 7L7 17M7 7l10 10" />
    </svg>
  </div>
));

const TABLE_TOP_LEFT = 'newui_item_table01(L).OZT';
const TABLE_TOP_RIGHT = 'newui_item_table01(R).OZT';
const TABLE_BOTTOM_LEFT = 'newui_item_table02(L).OZT';
const TABLE_BOTTOM_RIGHT = 'newui_item_table02(R).OZT';
const TABLE_TOP_PIXEL = 'newui_item_table03(Up).OZT';
const TABLE_BOTTOM_PIXEL = 'newui_item_table03(Dw).OZT';
const TABLE_LEFT_PIXEL = 'newui_item_table03(L).OZT';
const TABLE_RIGHT_PIXEL = 'newui_item_table03(R).OZT';

export const TABLE_CORNER = 14;

type MuTableFrameProps = {
  left: number;
  top: number;
  width: number;
  height: number;
  className?: string;
};

export const MuTableFrame = ({
  left,
  top,
  width,
  height,
  className,
}: MuTableFrameProps) => {
  const runX = Math.max(0, width - TABLE_CORNER * 2);
  const runY = Math.max(0, height - TABLE_CORNER * 2);

  const edge = (file: string, style: CSSProperties, repeat: string) => (
    <MuSpriteFrame
      file={file}
      style={{ position: 'absolute', backgroundRepeat: repeat, ...style }}
    />
  );

  return (
    <div
      className={`mu-table-frame${className ? ` ${className}` : ''}`}
      style={{ left, top, width, height }}
    >
      {edge(
        TABLE_TOP_PIXEL,
        { left: TABLE_CORNER, top: 0, width: runX, height: TABLE_CORNER },
        'repeat-x'
      )}
      {edge(
        TABLE_BOTTOM_PIXEL,
        {
          left: TABLE_CORNER,
          top: height - TABLE_CORNER,
          width: runX,
          height: TABLE_CORNER,
        },
        'repeat-x'
      )}
      {edge(
        TABLE_LEFT_PIXEL,
        { left: 0, top: TABLE_CORNER, width: TABLE_CORNER, height: runY },
        'repeat-y'
      )}
      {edge(
        TABLE_RIGHT_PIXEL,
        {
          left: width - TABLE_CORNER,
          top: TABLE_CORNER,
          width: TABLE_CORNER,
          height: runY,
        },
        'repeat-y'
      )}

      <MuSpriteFrame
        file={TABLE_TOP_LEFT}
        width={TABLE_CORNER}
        height={TABLE_CORNER}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
      <MuSpriteFrame
        file={TABLE_TOP_RIGHT}
        width={TABLE_CORNER}
        height={TABLE_CORNER}
        style={{ position: 'absolute', left: width - TABLE_CORNER, top: 0 }}
      />
      <MuSpriteFrame
        file={TABLE_BOTTOM_LEFT}
        width={TABLE_CORNER}
        height={TABLE_CORNER}
        style={{ position: 'absolute', left: 0, top: height - TABLE_CORNER }}
      />
      <MuSpriteFrame
        file={TABLE_BOTTOM_RIGHT}
        width={TABLE_CORNER}
        height={TABLE_CORNER}
        style={{
          position: 'absolute',
          left: width - TABLE_CORNER,
          top: height - TABLE_CORNER,
        }}
      />
    </div>
  );
};

export const MuTableRule = ({
  left,
  top,
  width,
}: {
  left: number;
  top: number;
  width: number;
}) => (
  <MuSpriteFrame
    file={TABLE_BOTTOM_PIXEL}
    style={{
      position: 'absolute',
      left,
      top,
      width,
      height: TABLE_CORNER,
      backgroundRepeat: 'repeat-x',
    }}
  />
);

export const MU_WINDOW_SPRITES = [
  BACK_SPRITE,
  TOP_SPRITE,
  LEFT_SPRITE,
  RIGHT_SPRITE,
  BOTTOM_SPRITE,
  TABLE_TOP_LEFT,
  TABLE_TOP_RIGHT,
  TABLE_BOTTOM_LEFT,
  TABLE_BOTTOM_RIGHT,
  TABLE_TOP_PIXEL,
  TABLE_BOTTOM_PIXEL,
  TABLE_LEFT_PIXEL,
  TABLE_RIGHT_PIXEL,
];

export {
  MuResizeGrip,
  useWindowChrome,
  useWindowStackEntry,
} from './useWindowChrome';
