import './accountWidgets.less';
import './reforgeShell.less';
import { useCallback, useEffect, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { useWindowChrome } from '@/controllers/interface/components/mu_window';
import { useMuSprite } from '@/controllers/interface/components/mu_sprite';
import { togglesWindow } from '@/controllers/interface/components/module_window';
import { useEventBus } from '@/controllers/interface/hooks';
import { playUiSound } from '@/controllers/sound/sfx';
import { AccountButton } from './accountWidgets';

/**
 * Our client's MU Reforge window shell (template `window_shell`, themes/legacy/reforge_window.rcss):
 * the message box art at any width, the title banner, a content box 18 in from the sides, 35 under
 * the top and 24 over the bottom, opening in the middle of the screen and dragged from its frame.
 * Sizes are desktop dp: 1 dp is 1 px of the 640x480 stage, so the window follows the stage scale
 * (`scaleBy: 'stage'`, capped at 2) times the interface scale. How to build one: `../readme.md`.
 */

const TOP = 'newui_msgbox_top.OZT';
const MIDDLE = 'newui_msgbox_middle.OZT';
const BOTTOM = 'newui_msgbox_bottom.OZT';
const BANNER = 'newui_Message_03.OZT';
const BACK = 'newui_msgbox_back.OZJ';

/** reforge_window.rcss `#panel`: the default width. */
export const SHELL_WIDTH = 230;
/** Before the first measure of a window whose height follows its content. */
const AUTO_HEIGHT_GUESS = 200;

/** A band of the message box art: its two ornamented ends keep their size, the bar between stretches. */
const Band = observer(({ file, ends, style }: { file: string; ends: number; style: CSSProperties }) => {
  const sprite = useMuSprite(file);
  return (
    <div
      className="rf-band"
      style={{
        borderWidth: `0 ${ends}px`,
        borderImage: sprite ? `url(${sprite.url}) 0 ${ends} 0 ${ends} fill / 0 ${ends}px stretch` : undefined,
        ...style,
      }}
    />
  );
});

const ShellFrame = observer(({ titled }: { titled: boolean }) => {
  const back = useMuSprite(BACK);
  return (
    <>
      <div className="rf-back" style={{ backgroundImage: back ? `url(${back.url})` : undefined }} />
      {/* Ends 60 / 12 / 50 in: where the art's corner ornaments stop (rf-cap-*-inner). */}
      <Band file={MIDDLE} ends={12} style={{ top: 67, bottom: 50 }} />
      <Band file={TOP} ends={60} style={{ top: 0, height: 67 }} />
      <Band file={BOTTOM} ends={50} style={{ bottom: 0, height: 50 }} />
      {titled && <Band file={BANNER} ends={60} style={{ top: 0, height: 67 }} />}
    </>
  );
});

type ShellProps = {
  /** The window id (`MuWindows`: open flag, stack, Escape, drag place). */
  id: string;
  title: string;
  /** dp; 230 unless the desktop window says otherwise. */
  width?: number;
  /** dp; omitted, the window grows with its content. */
  height?: number;
  /** Drawn while true; `MuWindows.isOpen(id)` by default. */
  open?: boolean;
  /** Toggles `MuWindows`' open flag (a key bound to a built-in action stays the action's). */
  hotKey?: string;
  /** Close button and Escape; closes the open flag by default. Escape returning false passes it on. */
  onClose?: () => boolean | void;
  /** The centred Close button at the bottom (`.rf-close`); off for a window that draws its own row. */
  closeButton?: boolean;
  className?: string;
  /** Over the whole window (a confirm box). */
  overlay?: ReactNode;
  children?: ReactNode;
};

const ShellBody = observer(({ id, title, width = SHELL_WIDTH, height, onClose, closeButton = true, className, overlay, children }: ShellProps) => {
  const [measured, setMeasured] = useState(height ?? AUTO_HEIGHT_GUESS);
  const close = () => (onClose ? onClose() : MuWindows.setOpen(id, false));
  const chrome = useWindowChrome(id, {
    width,
    height: height ?? measured,
    open: 'center',
    scaleBy: 'stage',
    onClose: () => {
      const result = close();
      if (result !== false) playUiSound('click');
      return result;
    },
  });
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const stackRef = chrome.ref as (el: HTMLElement | null) => void;
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      stackRef(el);
      setRoot(el);
      if (el) el.focus({ preventScroll: true });
    },
    [stackRef]
  );

  // A window whose height follows its content tells the stack its size, so it centres and fits.
  // The observer's first report comes before the first paint, so the window opens centred on its real height.
  useEffect(() => {
    if (height !== undefined || !root) return;
    const measure = () => setMeasured(h => (root.offsetHeight && root.offsetHeight !== h ? root.offsetHeight : h));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const watcher = new ResizeObserver(measure);
    watcher.observe(root);
    return () => watcher.disconnect();
  }, [root, height]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      className={`rf-shell${className ? ` ${className}` : ''}`}
      onPointerDown={chrome.onPointerDown}
      style={{ ...chrome.style, height: height ?? 'auto' }}
    >
      <ShellFrame titled={!!title} />
      {title && <div className="rf-shell-title">{title}</div>}
      <div className={`rf-content${title ? '' : ' untitled'}`} data-no-drag="true">
        {children}
        {closeButton && <RfClose onClick={() => void close()} />}
      </div>
      {overlay}
    </div>
  );
});

/** The Mu Reforge window: hides while closed, its hot key toggles it. */
export const ReforgeShell = observer((props: ShellProps) => {
  const { id, hotKey } = props;
  useEventBus('keyPressed', key => {
    if (togglesWindow(hotKey, key)) MuWindows.setOpen(id, !MuWindows.isOpen(id));
  });
  const open = props.open ?? MuWindows.isOpen(id);
  return open ? <ShellBody {...props} /> : null;
});

// ---- the shell's parts (reforge_window.rcss) ----------------------------------------------------

export type RfTab<T extends string | number> = { id: T; label: string; /** Something on it runs now (`.rf-pip`). */ live?: boolean; title?: string };

type TabsProps<T extends string | number> = { tabs: readonly RfTab<T>[]; active: T; onSelect: (id: T) => void };

/** `.rf-tabs`: one tab per page, sharing the row, 22 high and 6 over what follows. */
export const RfTabs = observer(function RfTabs<T extends string | number>({ tabs, active, onSelect }: TabsProps<T>) {
  return (
    <div className="rf-tabs" data-no-drag="true">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`rf-tab${tab.id === active ? ' active' : ''}`}
          title={tab.title}
          onClick={() => {
            if (tab.id === active) return;
            playUiSound('click');
            onSelect(tab.id);
          }}
        >
          {tab.label}
          {tab.live && <span className="rf-pip" />}
        </div>
      ))}
    </div>
  );
}) as <T extends string | number>(props: TabsProps<T>) => ReactElement;

export type RfColumn = {
  label: ReactNode;
  /** dp; a column without one takes the rest. */
  width?: number;
  align?: 'left' | 'center' | 'right';
  onClick?: () => void;
  title?: string;
};

/** The style of a cell under `column`: its width (or the rest) and alignment. */
export const columnStyle = (column: RfColumn): CSSProperties =>
  column.width !== undefined
    ? { flex: `0 0 ${column.width}px`, width: column.width, textAlign: column.align }
    : { flex: '1 1 0', minWidth: 0, textAlign: column.align };

/** `.rf-table-head`: the gold captions over a list. */
export const RfTableHead = observer(({ columns, className }: { columns: readonly RfColumn[]; className?: string }) => (
  <div className={`rf-table-head${className ? ` ${className}` : ''}`}>
    {columns.map((column, i) => (
      <span
        key={i}
        className={column.onClick ? 'rf-col clickable' : 'rf-col'}
        style={columnStyle(column)}
        title={column.title}
        onClick={column.onClick}
      >
        {column.label}
      </span>
    ))}
  </div>
));

/** `.rf-list`: the sunken list, `height` dp at most; it scrolls past that. */
export const RfList = observer(({ height, className, children }: { height?: number; className?: string; children?: ReactNode }) => (
  <div className={`rf-list${className ? ` ${className}` : ''}`} style={height !== undefined ? { height } : undefined}>
    {children}
  </div>
));

/** `.rf-footer`: the muted line under a list. */
export const RfFooter = observer(({ children, className, title }: { children?: ReactNode; className?: string; title?: string }) => (
  <div className={`rf-footer${className ? ` ${className}` : ''}`} title={title}>
    {children}
  </div>
));

type RfButtonProps = {
  label: string;
  onClick: () => void;
  /** `.rf-small`, 64 wide. */
  small?: boolean;
  /** dp, instead of 96 / 64. */
  width?: number | string;
  /** `.locked`: dimmed, the click says why (`onRefused`). */
  disabled?: boolean;
  onRefused?: () => void;
  active?: boolean;
  title?: string;
  className?: string;
};

/** `.rf-btn`: 96x29 (64 small), the web client's own reforge button look. */
export const RfButton = observer(({ label, onClick, small, width, disabled, onRefused, active, title, className }: RfButtonProps) => (
  <AccountButton
    className={`rf-btn${small ? ' rf-small' : ''}${className ? ` ${className}` : ''}`}
    style={width !== undefined ? { width } : undefined}
    label={label}
    onClick={onClick}
    disabled={disabled}
    onRefused={onRefused}
    active={active}
    title={title}
  />
));

/** A centred row of buttons, 4 apart. */
export const RfButtons = observer(({ children, className }: { children?: ReactNode; className?: string }) => (
  <div className={`rf-buttons${className ? ` ${className}` : ''}`}>{children}</div>
));

/** `.rf-close`: the centred Close button, 6 under the content. */
export const RfClose = observer(({ onClick, label }: { onClick: () => void; label?: string }) => (
  <RfButton className="rf-close" label={label ?? t('common.close')} onClick={onClick} />
));
