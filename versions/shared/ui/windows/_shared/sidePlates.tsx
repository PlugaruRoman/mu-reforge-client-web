import './sidePlates.less';
import { observer } from 'mobx-react-lite';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { isMobileDevice } from '@/controllers/interface/mobile';

/**
 * The 36x29 plates our client hangs off the LEFT edge of a classic window (character_info.rcss
 * `.reforge-plate`, reforge_inventory_shortcuts.rcss, guild_info.rcss): 44 px out (36 + an 8 px gap),
 * in the window's own logical pixels, so they move and scale with it. The art is two frames, up over
 * pressed (Data-reforge/Interface); an open window keeps its plate pressed.
 */
export const PLATE_WIDTH = 36;
export const PLATE_HEIGHT = 29;
export const PLATE_LEFT = -44;

/**
 * A phone draws the plates hanging off a window this much larger (a 0.85 window made them 30 x 25 px):
 * about 50 x 40 px, each still 8 px off the window, the stack spread about the window's nearer edge so
 * the plates keep their gaps.
 */
const PHONE_PLATE_SCALE = 1.6;
/** The classic window's height (`WINDOW_HEIGHT`): plates in its lower half stack from its foot. */
const WINDOW_HEIGHT = 429;

function phonePlace(top: number, height: number): { top: number; transform: string } {
  const k = PHONE_PLATE_SCALE;
  const fromFoot = top + height / 2 > WINDOW_HEIGHT / 2;
  return {
    top: fromFoot ? WINDOW_HEIGHT - (WINDOW_HEIGHT - top) * k : top * k,
    transform: `scale(${k})`,
  };
}

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
  /** Left edge; the default hangs it off the window's left side. */
  left?: number;
  /** Art other than 36x29 (the master tree's 30x22 Reset Tree). */
  width?: number;
  height?: number;
  /** Extra class on the plate (`dim`: our client's OFF EXP, 0.78 until hovered). */
  className?: string;
  onClick: () => void;
};

export const SidePlate = observer(
  ({
    top,
    file,
    title,
    description,
    active,
    left = PLATE_LEFT,
    width = PLATE_WIDTH,
    height = PLATE_HEIGHT,
    className,
    onClick,
  }: SidePlateProps) => (
    <div
      className={`side-plate${className ? ` ${className}` : ''}`}
      data-no-drag="true"
      style={{ left, top, ...(isMobileDevice() && left < 0 ? phonePlace(top, height) : null) }}
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
  )
);
