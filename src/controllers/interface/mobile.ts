/**
 * The one place the client decides it is played by touch (`?mobile=1|0` overrides).
 * Imported by `app/main.tsx` before the version loads, so it has no imports. See readme.md.
 */

const ROOT_CLASS = 'mu-mobile';

function readOverride(): boolean | null {
  if (typeof window === 'undefined') return null;
  // `location` can be missing where tests stub `window` (camera/view.test.ts).
  const param = new URLSearchParams(window.location?.search ?? '').get('mobile');
  if (param === '1') return true;
  if (param === '0') return false;
  return null;
}

function detect(): boolean {
  const override = readOverride();
  if (override !== null) return override;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return coarse && navigator.maxTouchPoints > 0;
}

const mobile = detect();

// The class the stylesheets key on, set before React's first paint so no
// desktop rule flashes on a phone.
if (mobile && typeof document !== 'undefined') {
  document.documentElement.classList.add(ROOT_CLASS);
  watchKeyboard();
}

/**
 * `--mu-keyboard`: how much of the layout the on-screen keyboard covers. A phone shrinks only the
 * visual viewport for it, so a field at the bottom (the chat line) would sit under the keys; the
 * chat lifts itself by this much.
 */
function watchKeyboard(): void {
  const view = window.visualViewport;
  if (!view) return;
  const update = () => {
    const covered = Math.max(0, window.innerHeight - view.height - view.offsetTop);
    document.documentElement.style.setProperty('--mu-keyboard', `${Math.round(covered)}px`);
  };
  view.addEventListener('resize', update);
  view.addEventListener('scroll', update);
}

export function isMobileDevice(): boolean {
  return mobile;
}

export function useIsMobile(): boolean {
  return mobile;
}

/**
 * The touch HUD's unit (our Android client sizes its touch controls in `vh`): 1% of the screen's
 * height, capped for a tablet (6.5 px) and for a phone held upright (0.9% of the width).
 */
export function touchUnit(width: number, height: number): number {
  return Math.min(height / 100, width * 0.009, 6.5);
}
