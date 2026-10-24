/**
 * Mu Reforge packet set: the classes `bun run generate -- versions/reforge/packets` builds from
 * our server's own XML (`packetsDefinitions/`, a copy of S src/Network/Packets/{ServerToClient,
 * ClientToServer,ConnectServer}/*Packets.xml), so codes, sub-codes and lengths are the ones our
 * server writes. The handlers still parse with the `versions/shared/packets` classes of the same
 * name; every packet M1 handles has the same layout in both XMLs.
 *
 * Export exactly these names: the dispatcher in `controllers/net/sockets/createSocket.ts` reads
 * them off the resolved version.
 */
import { ServerToClientPackets as generated } from './ServerToClientPackets';
import { ClientToServerPackets as generatedRequests } from './ClientToServerPackets';
import { ChangeMapServerInfoPacket } from '../../season6/packets/mapServerMove';
import { PingRelayPacket } from '../../season6/packets/pingRelay';
import { ShowHealthStatusPacket } from './healthStatus';
import { MarketStoreCurrenciesPacket } from './marketStoreCurrencies';
import { EVENT_PACKETS } from './eventPackets';
import { ITEM_COLLECTION_PACKETS } from './itemCollections';
import { SYSTEM_PACKETS } from './systemPackets';
import { ACCOUNT_SYSTEM_PACKETS } from './accountSystems';
import { CASH_SHOP_PACKETS } from './cashShop';
import { QUEST_BOARD_PACKETS } from './questBoard';

/**
 * The classic packets a ClientVersion(106, 3) never gets: the `[MinimumClient(106, 3)]` plug-in
 * of the same view sends the `...Extended` sibling instead (S GameServer/RemoteView). Listing
 * them would let a variable packet of a classic one's fixed length be read as that one (an
 * `ItemsDropped` with one 12-byte item is 21 bytes, like `MoneyDropped`).
 */
export const REPLACED_BY_EXTENDED: ReadonlySet<string> = new Set([
  'AddCharactersToScope', // NewPlayersInScopeExtendedPlugIn
  'AddTransformedCharactersToScope',
  'AppearanceChanged', // AppearanceChangedExtendedPlugIn
  'ObjectHit', // ShowHitExtendedPlugIn
  'ObjectWalked', // ObjectMovedPlugInExtended
  'MoneyDropped', // ShowMoneyDropExtendedPlugIn (own code 0x2F)
  'ExperienceGained', // AddExperienceExtendedPlugIn
  'CurrentHealthAndShield', // UpdateStatsExtendedPlugIn
  'MaximumHealthAndShield',
  'ItemConsumptionFailed', // RequestedItemConsumptionFailedExtendedPlugIn
  'PlayerShopItemList', // ShowShopItemListExtendedPlugIn
  'PlayerShopBuyResult', // PlayerShopBuyRequestResultExtendedPlugIn
  'CharacterList', // ShowCharacterListExtendedPlugIn
  'RespawnAfterDeath', // RespawnAfterDeathExtendedPlugIn
  'CharacterStatIncreaseResponse', // StatIncreaseResultExtendedPlugIn
  'CharacterLevelUpdate', // UpdateLevelExtendedPlugIn
  'MasterCharacterLevelUpdate',
  'CharacterInformation', // UpdateCharacterStatsExtendedPlugIn
  'MasterStatsUpdate', // UpdateMasterStatsExtendedPlugIn
  'OpenLetter', // ShowLetterExtendedPlugIn
  'QuestProgress', // QuestProgressExtendedPlugIn
  'QuestState', // QuestStateResponseExtendedPlugIn
]);

/** The anti-cheat frames (C1 E7 00-03) of our own client: a browser never sends or answers them. */
const GUARD = new Set(['MachineIdRequest', 'GuardDetectionReport', 'GuardIntegrityChallenge', 'GuardIntegrityResponse']);

/**
 * Classes our XML defines on a frame another class of the same code and length already claims,
 * so the dispatcher could never pick them. `ChaosCastleScore` is the 29-byte C1 93 of
 * `BloodCastleScore` with Type (byte 4) 0xFE instead of 0xFF: it arrives as `BloodCastleScore`
 * and `modules/events/bloodCastle.ts` tells the two apart by that byte, as our client does
 * (NewChaosCastleSystem.cpp / NewBloodCastleSystem.cpp `SetMatchResult` 254 / 255).
 */
export const SAME_FRAME: ReadonlySet<string> = new Set(['ChaosCastleScore']);

/** The pre-Season 6 variants (`...075` / `...095` / `...097`) go to older clients only. */
const keep = (p: { Name: string }) =>
  !REPLACED_BY_EXTENDED.has(p.Name) && !GUARD.has(p.Name) && !SAME_FRAME.has(p.Name) && !/0(75|95|97)$/.test(p.Name);

/**
 * Our generated set plus the hand-written frames: the map-server move (C1 B1 00), the proxy's
 * ping relay (C1 FB) and our server's ED 01 health status (`./healthStatus.ts`). No module
 * packet: E8 is our Market on this server (its hand-written E8 06: `./marketStoreCurrencies.ts`). No band relay either: C1 FA is our Item Collections
 * (S GameServer/RemoteView/ItemCollections/ItemCollectionViewPlugIn.cs, FA 01 / FA 02, `./itemCollections.ts`), which the
 * band module would read as a performer's Start / Stop; `band` is in `modulesOff` (../index.ts).
 */
export const ServerToClientPackets = [...generated.filter(keep), ChangeMapServerInfoPacket, PingRelayPacket, ShowHealthStatusPacket, ...EVENT_PACKETS, ...SYSTEM_PACKETS, ...ACCOUNT_SYSTEM_PACKETS, ...ITEM_COLLECTION_PACKETS, MarketStoreCurrenciesPacket, ...CASH_SHOP_PACKETS, ...QUEST_BOARD_PACKETS];
export const ClientToServerPackets = generatedRequests.filter(keep);
export { ChangeMapServerInfoPacket };
export { ConnectServerPackets } from './ConnectServerPackets';
