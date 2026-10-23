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

/** The guild window's bottom row: Exit is at (13, 392), our Settings and Castle follow it. */
export const GUILD_ROW_Y = 392;
export const SETTINGS_BUTTON_X = 52;
export const CASTLE_BUTTON_X = 117;
export const GUILD_BUTTON = { width: 64, height: 29 };
export const GUILD_BUTTON_SPRITE = 'newui_btn_empty_small.OZT';

/** The settings grid: one row per rank, IN / OUT boxes. */
export const SETTINGS_ROW_Y = 96;
export const SETTINGS_ROW_STEP = 22;
