import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { uiClick } from '@/controllers/sound/sfx';

/** Keeps the finger's events on this control; a replayed or stale pointer has nothing to capture. */
export function capture(e: PointerEvent): void {
  try {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  } catch {
    // Nothing to keep.
  }
}

/**
 * A touch button. `MuButton` cannot serve here: its hover and pressed frames
 * come from `onMouseEnter` / `onMouseDown`, which a browser only synthesises
 * after the finger has already left the glass, so on a phone it never looks
 * pressed. This drives the pressed look (`.held`, our Android client's
 * `<id>_held`) from pointer events, and adds the long press the skill
 * buttons need.
 */

/** Held this long (ms) without moving, a press is a long press, not a tap. */
const LONG_PRESS_MS = 400;
/** Pixels the finger may wander before the press stops counting as either. */
const SLOP = 12;

type MobileButtonProps = {
  onTap?: () => void;
  onLongPress?: () => void;
  /** The finger came down (the attack button acts at once, not on release). */
  onPress?: () => void;
  /** The finger left, however the press ended. */
  onRelease?: () => void;
  longPressMs?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Rendered with `pressed` so the caller can swap its own art. */
  children: (pressed: boolean) => ReactNode;
};

export const MobileButton = observer(({
  onTap,
  onLongPress,
  onPress,
  onRelease,
  longPressMs = LONG_PRESS_MS,
  className,
  style,
  title,
  children,
}: MobileButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const press = useRef<{ x: number; y: number; timer: number; long: boolean } | null>(null);

  const end = () => {
    const held = press.current;
    press.current = null;
    setPressed(false);
    if (held) {
      window.clearTimeout(held.timer);
      onRelease?.();
    }
    return held;
  };

  return (
    <div
      className={`${className ?? ''}${pressed ? ' held' : ''}`}
      title={title}
      style={style}
      onPointerDown={e => {
        e.stopPropagation();
        capture(e);
        setPressed(true);
        const timer = window.setTimeout(() => {
          if (!press.current || !onLongPress) return;
          press.current.long = true;
          onRelease?.();
          uiClick(onLongPress)();
        }, longPressMs);
        press.current = { x: e.clientX, y: e.clientY, timer, long: false };
        onPress?.();
      }}
      onPointerMove={e => {
        const held = press.current;
        if (!held || onPress) return;
        if (Math.hypot(e.clientX - held.x, e.clientY - held.y) > SLOP) end();
      }}
      onPointerUp={e => {
        e.stopPropagation();
        const held = end();
        if (held && !held.long && !onPress) uiClick(onTap)();
      }}
      onPointerCancel={end}
      // The world reads the raw pointer stream off the canvas; a press that
      // started on a button is never also a click on the ground behind it.
      onContextMenu={e => e.preventDefault()}
    >
      {children(pressed)}
    </div>
  );
});
