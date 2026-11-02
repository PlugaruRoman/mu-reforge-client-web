import './sidePlates.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { addSidePlate, sidePlateLeft, useItemWindowId } from '@/controllers/interface/components/mu_window';

/**
 * The 36x29 plates our client hangs off the LEFT edge of a classic window (character_info.rcss
 * `.reforge-plate`, reforge_inventory_shortcuts.rcss, guild_info.rcss): 44 px out (36 + an 8 px gap),
 * in the window's own logical pixels, so they move and scale with it. The art is two frames, up over
 * pressed (Data-reforge/Interface); an open window keeps its plate pressed.
 *
 * Unlike our client, a plate of a docked window with another one docked left of it moves out past
 * the dock (`sidePlateLeft`) instead of lying on the neighbour's grid; the tooltip opens to the left
 * and flips to the right when the screen's left edge would cut it.
 */
export const PLATE_WIDTH = 36;
export const PLATE_HEIGHT = 29;
export const PLATE_LEFT = -44;

const UP = { up: 0, down: 1 } as const;
const HELD = { up: 1, down: 1 } as const;

export type SidePlateProps = {
  /** Top edge in the window's logical pixels. */
  top: number;
  /** Interface sprite, e.g. `newui_chainfo_btn_reset.OZT`. */
  file: string;
  title: string;
  /** Second tooltip line. */
  description?: string;
  /** Held down while its window is open. */
  active?: boolean;
  /** Left edge; the default hangs it off the window's left side (or the dock's, see above). */
  left?: number;
  /** Art other than 36x29 (the master tree's 30x22 Reset Tree). */
  width?: number;
  height?: number;
  /** Extra class on the plate (`dim`: our client's OFF EXP, 0.78 until hovered). */
  className?: string;
  onClick: () => void;
};

/** Room the tooltip needs to the plate's left, in the window's logical pixels (its max width and gap). */
const TIP_ROOM = 178;

export const SidePlate = observer(
  ({
    top,
    file,
    title,
    description,
    active,
    left,
    width = PLATE_WIDTH,
    height = PLATE_HEIGHT,
    className,
    onClick,
  }: SidePlateProps) => {
    const windowId = useItemWindowId();
    const hanging = left === undefined && windowId !== null;
    useEffect(() => (hanging && windowId ? addSidePlate(windowId) : undefined), [hanging, windowId]);
    const [tipRight, setTipRight] = useState(false);
    const x = left ?? (windowId ? sidePlateLeft(windowId) : PLATE_LEFT);
    return (
      <div
        className={`side-plate${tipRight || (hanging && x > 0) ? ' tip-right' : ''}${className ? ` ${className}` : ''}`}
        data-no-drag="true"
        style={{ left: x, top }}
        onPointerEnter={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          const scale = rect.width / width || 1;
          setTipRight(rect.left < TIP_ROOM * scale);
        }}
      >
        <MuButton
          file={file}
          width={width}
          height={height}
          frames={active ? HELD : UP}
          onClick={onClick}
        >
          <span className="side-plate-tip">
            <span className="side-plate-title">{title}</span>
            {description && (
              <span className="side-plate-text">{description}</span>
            )}
          </span>
        </MuButton>
      </div>
    );
  }
);
