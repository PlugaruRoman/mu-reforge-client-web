/**
 * The X-shop window (`CInGameShop`, our client's in_game_shop.rml): 560 x 380, the package grid on the left
 * (3 x 3 cards, `INGAMESHOP_DISPLAY_ITEMLIST_SIZE`) and the shop storage on the right.
 */
export const WINDOW_ID = 'xshop';
export const WIDTH = 560;
export const HEIGHT = 380;
/** X (HotKey.cpp:320 `IsPress('X')`). */
export const HOT_KEY = 'KeyX';
export const BACK_SPRITE = 'newui_msgbox_back.OZJ';

export const GRID_FRAME = { left: 10, top: 92, width: 360, height: 256 };
export const STORAGE_FRAME = { left: 380, top: 92, width: 170, height: 256 };
