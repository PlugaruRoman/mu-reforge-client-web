import './style.less';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { useIsMobile } from '@/controllers/interface/mobile';
import { useUiViewport } from '@/controllers/interface/components/ui_stage';

/** The screens drawn on the 640x480 stage or the world: a phone held upright shows them tiny. */
const STAGED = new Set([UIState.Login, UIState.Characters, UIState.World]);

/**
 * A phone held upright: a picture of it turning sideways, over the game. A tap anywhere puts it
 * away for the rest of the page; turning the phone puts it away by itself. Drawn only on touch.
 */
export const RotateHint = observer(() => {
  const mobile = useIsMobile();
  const { width, height } = useUiViewport();
  const [dismissed, setDismissed] = useState(false);

  if (!mobile || dismissed || height <= width || !STAGED.has(AppState.uiState)) return null;

  return (
    <div className="rotate-hint" onPointerDown={() => setDismissed(true)}>
      <svg className="rotate-hint-phone" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="22" y="8" width="20" height="36" rx="3" />
        <circle cx="32" cy="39" r="1.5" />
        <path className="rotate-hint-arrow" d="M48 30a16 16 0 0 1-14 22m0 0 4-4m-4 4 5 3" />
      </svg>
      <div className="rotate-hint-close" aria-hidden="true">
        ×
      </div>
    </div>
  );
});
