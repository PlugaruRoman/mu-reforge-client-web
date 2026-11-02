import { observer } from 'mobx-react-lite';

/**
 * The touch HUD's pictograms: our Android client's set (icons/touch, Tabler names in
 * `tools/reforge/touch_icons.py`), drawn here as 24 px line glyphs in the MU gold with a dark
 * outline, so every version has them without an image file.
 */
export type TouchIconName =
  | 'attack'
  | 'character'
  | 'inventory'
  | 'shop'
  | 'warp'
  | 'menu'
  | 'chat'
  | 'helper'
  | 'helperSettings'
  | 'skillSettings'
  | 'close';

const PATHS: Record<TouchIconName, string> = {
  // sword
  attack: 'M20 4v5l-9 7l-4 4l-3 -3l4 -4l7 -9zM6.5 11.5l6 6M5 21l-2 -2',
  // user
  character: 'M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2',
  // backpack
  inventory: 'M5 18v-6a6 6 0 0 1 6 -6h2a6 6 0 0 1 6 6v6a3 3 0 0 1 -3 3h-8a3 3 0 0 1 -3 -3zM10 6v-1a2 2 0 1 1 4 0v1M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4M11 10h2',
  // building-store
  shop: 'M3 21h18M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4M5 21v-10.15M19 21v-10.15M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4',
  // map-pin
  warp: 'M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z',
  // menu-2
  menu: 'M4 6h16M4 12h16M4 18h16',
  // message-circle
  chat: 'M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1',
  // robot
  helper: 'M6 6a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2zM12 2v2M9 12v9M15 12v9M5 16l4 -2M15 14l4 2M9 18h6M10 8v.01M14 8v.01',
  // adjustments-horizontal
  helperSettings: 'M12 6a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M4 6h8M16 6h4M6 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M4 12h2M10 12h10M15 18a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M4 18h11M19 18h1',
  // settings
  skillSettings:
    'M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065zM9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
  // x
  close: 'M18 6l-12 12M6 6l12 12',
};

export const TouchIcon = observer(({ name, className }: { name: TouchIconName; className?: string }) => (
  <svg className={`touch-icon${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden="true">
    <path className="touch-icon-outline" d={PATHS[name]} />
    <path className="touch-icon-glyph" d={PATHS[name]} />
  </svg>
));
