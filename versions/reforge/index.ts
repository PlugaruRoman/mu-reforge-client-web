/**
 * Mu Reforge - Season 6 Episode 3 content spoken over the protocol of our server, a fork of
 * OpenMU (S = mu-reforge-server). It logs in as client version `20404`, ClientVersion(106, 3)
 * "Open Source", so the server answers with its `MinimumClient(106, 3)` plug-ins: the
 * `...Extended` packets and the 5-15 byte `ItemSerializerExtended` items.
 *
 * Everything but the wire is Season 6: data, tables and UI are Season 6's, and so are the keys
 * (S Persistence/Initialization/VersionSeasonSix/DataInitialization.cs:52-71 gives both client
 * definitions the same serial; only the version bytes differ).
 */
import { asciiBytes, type GameVersion } from '@/version/contract';
import { BaseClass } from '@/core/types';
import { gameVersion as season6 } from '../season6';
import { reforgeData } from './data';
// Our own monsters and NPCs (ReforgeMonsters.cpp), registered over Season 6's.
import './monsters/all';
import './items/all';

// The packet lists ride along in the version chunk; UI does not (it reaches
// app code and loads through the registry's loadUi, after this module).
export * as packets from './packets';

/**
 * At ClientVersion(106, 3) the server's `ViewPlugInContainer` picks the plug-in with the
 * highest `MinimumClient`, so an `...Extended` packet replaces its classic sibling (every
 * `[MinimumClient(106, 3, ...)]` plug-in in S GameServer/RemoteView). The classic siblings are
 * also left out of `packets/` (see there); this rank only orders what is left.
 */
function variantRank(name: string): number {
  if (/Extended$/.test(name)) return 0;
  if (/0(75|95|97)$/.test(name)) return 2;
  return 1;
}

export const gameVersion: GameVersion = {
  ...season6,
  id: 'reforge',
  label: 'Mu Reforge',
  listTag: 'REFORGE',
  // Season 6's trees plus our own art and worlds (data/index.ts).
  data: reforgeData,
  // The "Open Source" client definition, ClientVersion(106, 3) (S VersionSeasonSix/DataInitialization.cs:64-71).
  // Its connect server listens on 44406, the one after the GMO client's 44405 (S DataInitializationBase.cs:540-558).
  clientVersionBytes: asciiBytes('20404'),
  protocol: {
    ...season6.protocol,
    packetSet: 'reforge',
    variantRank,
    itemCodec: 'extended',
    // Our server expands `\x01` slot `\x02` from the sender's inventory and drops any other token
    // (S GameServer/MessageHandler/ChatItemLinkExpander.cs), as our C++ client sends it.
    chatItemLinks: 'slot',
    // Our client's 60-byte login (20-byte password): a 50-byte short login is read with the long
    // layout by the server, which then misses the 20404 version (contract.ts loginPacket).
    loginPacket: 'long',
    // Server list groups of 20 ids, like our C++ client: Molten 0-19, Inferno 20-39 (contract.ts).
    serverGroupSize: 20,
    // Our classes' attack speed ceilings (S Persistence/Initialization/Updates/
    // AlignCharacterClassesWithInitializationUpdateSeason6.cs SpeedValues(_, max)), by BaseClass.
    attackSpeedCaps: {
      [BaseClass.Wizard]: 252,
      [BaseClass.Knight]: 255,
      [BaseClass.Elf]: 246,
      [BaseClass.MagicGladiator]: 262,
      [BaseClass.DarkLord]: 258,
      [BaseClass.Summoner]: 245,
      [BaseClass.RageFighter]: 254,
    },
  },
  // `marketplace` sends Babylon's escrow request, C1 E7 01, which our server reads as its
  // anti-cheat GuardDetectionReport (S GameServer/MessageHandler/AntiCheat/GuardDetectionReportHandlerPlugIn.cs).
  // The module packet (E8) needs no switch: our server sends no ModulePacket, and `packets/` does
  // not list it. The token login is forced off below (`serverSettingsOff`).
  // `band`: the proxy's band relay is C1 FA, which our server uses for its Item Collections
  // (S GameServer/RemoteView/ItemCollections/ItemCollectionViewPlugIn.cs); `packets/` lists no band class.
  modulesOff: ['marketplace', 'band'],
  // Babylon's bag bundling sends the Lahap mix with no NPC open: our server ignores the mix and
  // disconnects on the unmix (S GameLogic/PlayerActions/Items/ItemStackAction.cs). The token login
  // (E7 03/05) has no handler on our server: the login would hang, then ask for the password.
  serverSettingsOff: ['jewelBundling', 'loginTokens'],
  // Our C++ client's letters for our windows (H event timer, K VIP, S soul points, Y death records,
  // L guest access, N the Mu Reforge menu): the client actions that held them move off, so the window
  // keys reach them.
  keyDefaults: {
    hideUi: 'F9',
    skillList: '',
    sortInventory: '',
    replyWhisper: '',
    repair: '',
    targetNearest: '',
  },
};
