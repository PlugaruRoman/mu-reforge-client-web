import './accountWidgets.less';
import type { CSSProperties, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { playUiSound } from '@/controllers/sound/sfx';

/**
 * The pieces the Mu Reforge account windows (vip_shop, reset, add_stats, soul_points, jewel_bank)
 * draw inside the item window frame: our client's RmlUi rows, buttons and confirm box
 * (Interface/RmlUi/reforge_window.rcss) on the classic plate.
 */

/** 1234567 -> "1,234,567" (VipShopText.cpp `Amount`). */
export const amount = (n: number): string => Math.max(0, Math.floor(n)).toLocaleString('en-US');

/** The content box under the frame's title. */
export const AccountBody = observer(({ children, className }: { children?: ReactNode; className?: string }) => (
  // No drag from the body: it scrolls when its content is taller than the frame, and a press on its
  // scrollbar or a swipe through it moved the window instead. The frame and its title still drag.
  <div className={`acct-body${className ? ` ${className}` : ''}`} data-no-drag="true">
    {children}
  </div>
));

type ButtonProps = {
  label: string;
  onClick: () => void;
  /** Dimmed; a click plays the error sound and calls `onRefused` (a refused click says why). */
  disabled?: boolean;
  onRefused?: () => void;
  active?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
};

export const AccountButton = observer(({ label, onClick, disabled, onRefused, active, title, className, style }: ButtonProps) => (
  <div
    className={`acct-btn${disabled ? ' disabled' : ''}${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
    data-no-drag="true"
    title={title}
    style={style}
    onClick={() => {
      if (disabled) {
        playUiSound('error');
        onRefused?.();
        return;
      }
      playUiSound('click');
      onClick();
    }}
  >
    {label}
  </div>
));

/** A label on the left, its value on the right; `met` greens or reds the value. */
export const AccountRow = observer(({ label, value, met, className }: { label: string; value: string; met?: boolean; className?: string }) => (
  <div className={`acct-row${className ? ` ${className}` : ''}`}>
    <span className="acct-label">{label}</span>
    <span className={`acct-value${met === undefined ? '' : met ? ' met' : ' unmet'}`}>{value}</span>
  </div>
));

export type ConfirmLine = { text: string; bold?: boolean; color?: string };

/** The shared confirm dialog of our client (UI/Dialogs/ConfirmRequest), over the window's content. */
export const AccountConfirm = observer(({
  lines,
  buttons,
}: {
  lines: readonly ConfirmLine[];
  buttons: readonly { label: string; onClick: () => void; disabled?: boolean; title?: string }[];
}) => (
  <div className="acct-confirm" data-no-drag="true">
    <div className="acct-confirm-box">
      {lines.map((line, i) => (
        <div key={i} className={`acct-confirm-line${line.bold ? ' bold' : ''}`} style={line.color ? { color: line.color } : undefined}>
          {line.text}
        </div>
      ))}
      <div className="acct-confirm-buttons">
        {buttons.map(b => (
          <AccountButton key={b.label} label={b.label} onClick={b.onClick} disabled={b.disabled} title={b.title} />
        ))}
      </div>
    </div>
  </div>
));

/** A strip of small tabs fixed above a window's frame, the way our client adds buttons to a classic window. */
export const AccountTabStrip = observer(({ children }: { children?: ReactNode }) => (
  <div className="acct-strip" data-no-drag="true">
    {children}
  </div>
));
