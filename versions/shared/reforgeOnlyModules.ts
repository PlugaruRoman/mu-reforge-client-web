/**
 * The optional modules only the Mu Reforge server speaks: their packets are our
 * fork's own (VIP, resets, banks, events...), so every other version leaves them
 * off through its `modulesOff`, and `versions/reforge` leaves them on.
 *
 * A new Reforge-only module adds its id here, one per line.
 */
export const REFORGE_ONLY_MODULES: readonly string[] = [
  'reforge_market',
  'item_collections',
  'guild_bank',
  'event_list',
  'invasions',
  'tvt',
  'deep_dungeon',
  'hunt_log',
  'xshop',
  'vip',
  'resets',
  'soul_points',
  'jewel_bank',
  'olympiad',
  'doppelganger',
  'imperial_guardian',
  'fort_siege',
  'reforge_hud',
  'offline_modes',
  'vault_pages',
  'reforge_mix',
  'quest_board',
];
