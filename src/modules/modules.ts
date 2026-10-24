// Every module, in install order: for a packet several modules handle, this is the order their
// listeners run in. Keep it; the constraints are noted next to the entries (readme.md).
import type { ModuleDef } from './module';
import servers from './servers/module';
import session from './session/module';
import characterSelect from './character_select/module';
import quests from './quests/module';
import skills from './skills/module';
import hero from './hero/module';
import events from './events/module';
import warp from './warp/module';
import inventory from './inventory/module';
import scope from './scope/module';
import social from './social/module';
import chat from './chat/module';
import guild from './guild/module';
import party from './party/module';
import guildWar from './guild_war/module';
import friends from './friends/module';
import combat from './combat/module';
import drops from './drops/module';
import world from './world/module';
import marketplace from './marketplace/module';
import npcShop from './npc_shop/module';
import economy from './economy/module';
import vault from './vault/module';
import chaosMix from './chaos_mix/module';
import trade from './trade/module';
import personalShop from './personal_shop/module';
import options from './options/module';
import pets from './pets/module';
import muHelper from './mu_helper/module';
import band from './band/module';
import reforgeMarket from './reforge_market/module';
import itemCollections from './item_collections/module';
import guildBank from './guild_bank/module';
import eventList from './event_list/module';
import invasions from './invasions/module';
import tvt from './tvt/module';
import deepDungeon from './deep_dungeon/module';
import huntLog from './hunt_log/module';
import xshop from './xshop/module';
import vip from './vip/module';
import resets from './resets/module';
import soulPoints from './soul_points/module';
import jewelBank from './jewel_bank/module';
import olympiad from './olympiad/module';
import doppelganger from './doppelganger/module';
import imperialGuardian from './imperial_guardian/module';
import fortSiege from './fort_siege/module';
import reforgeHud from './reforge_hud/module';
import offlineModes from './offline_modes/module';
import vaultPages from './vault_pages/module';
import reforgeMix from './reforge_mix/module';
import questBoard from './quest_board/module';
import gm from './gm/module';
import credits from './credits/module';

export const MODULES: readonly ModuleDef[] = [
  servers,
  events, // before warp: Crywolf's warpCompleted and the duel's wsClosed run first
  warp, // before session: the scope hold's wsClosed runs before the session's
  session,
  characterSelect,
  quests, // before hero and combat: its CharacterInformation and ObjectGotKilled listeners run first
  skills, // before hero: the master level (masterLevel.ts) reads the experience packets first
  hero,
  inventory,
  scope,
  social,
  chat,
  guild,
  party,
  guildWar,
  friends,
  combat,
  drops,
  world,
  marketplace,
  npcShop,
  economy,
  vault,
  chaosMix,
  trade,
  personalShop,
  options,
  pets,
  muHelper,
  band,
  reforgeMarket,
  itemCollections,
  guildBank,
  eventList,
  invasions,
  tvt,
  deepDungeon,
  huntLog,
  xshop,
  vip,
  resets,
  soulPoints,
  jewelBank,
  olympiad,
  doppelganger,
  imperialGuardian,
  fortSiege,
  reforgeHud,
  offlineModes,
  vaultPages,
  reforgeMix,
  questBoard,
  gm,
  credits,
];
