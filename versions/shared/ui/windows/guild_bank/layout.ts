import { BANK_COLUMNS, BANK_ROWS } from '@/modules/guild_bank';

/**
 * Our client's reforge_guild_bank.rml is the vault's twin beside the inventory, so the bank sits on
 * the vault's frame (`CNewUIStorageInventory`, vault/layout.ts): the 8 x 15 grid at (15, 36), the
 * money well at (10, 342) and the buttons on the bottom edge at 37px pitch from x = 13; the page
 * arrows take the rest of that row.
 */
export const COLUMNS = BANK_COLUMNS;
export const ROWS = BANK_ROWS;
export const GRID_X = 15;
export const GRID_Y = 36;
export const TITLE_Y = 11;
export const HINT_Y = 22;

export const MONEY_SPRITE = 'newui_item_money3.OZT';
export const MONEY_X = 10;
export const MONEY_Y = 342;
export const MONEY_WIDTH = 170;
export const MONEY_HEIGHT = 46;
export const MONEY_TEXT_Y = MONEY_Y + 8;
export const MONEY_TEXT_RIGHT = 22;

export const BUTTON_Y = 391;
export const BUTTON_WIDTH = 36;
export const BUTTON_HEIGHT = 29;
export const BUTTON_FRAMES = { up: 0, down: 1, check: 1 } as const;
export const DEPOSIT_X = 13;
export const WITHDRAW_X = 50;
export const LOCK_X = 87;
export const PAGER = { x: 126, y: 397, width: 54, height: 16 };

export const DEPOSIT_SPRITE = 'newui_Bt_money01.OZT';
export const WITHDRAW_SPRITE = 'newui_Bt_money02.OZT';
export const UNLOCKED_SPRITE = 'newui_Bt_lock02.OZT';
export const LOCKED_SPRITE = 'newui_Bt_lock.OZT';

export const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };

/**
 * Our client's parts of the guild window (themes/legacy/guild_info.rcss, `#reforge_guild_parts`):
 * Settings beside Disband on the Guild tab, Castle on the exit button's row, and the guild master's
 * Guild Wars / Guild Alliance plates off the left edge above that row (33 px apart).
 */
export const SETTINGS_BUTTON = { x: 26, y: 350 };
export const CASTLE_BUTTON = { x: 108, y: 392 };
export const WARS_PLATE_TOP = 392;
export const ALLIANCE_PLATE_TOP = 359;
export const GUILD_BUTTON = { width: 64, height: 29 };
export const GUILD_BUTTON_SPRITE = 'newui_btn_empty_small.OZT';
