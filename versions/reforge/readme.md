# reforge

Mu Reforge: Season 6 Episode 3 played against our own server (`mu-reforge-server`, a fork of
OpenMU), over the protocol of its "Open Source" client definition, client version `20404`
(ClientVersion 106.3). At that version the server answers with its `MinimumClient(106, 3)`
plug-ins: the `...Extended` packets and the 5-15 byte `ItemSerializerExtended` items.

## Public API
- `gameVersion` (`index.ts`): Season 6's (`../season6`) with id `reforge`, label `Mu Reforge`,
  list tag `REFORGE`, client version bytes `20404`, `variantRank` (`...Extended` first, then
  the classic name, then `...075` / `...095` / `...097`), `protocol.itemCodec: 'extended'`
  and `modulesOff: ['marketplace', 'band']`. Features are Season 6's plus `extraSocketSets: [44, 104]`
  (the Eternal Wing and Tigris sets carry sockets) and `harmonyOnAncient` (the Jewel of Harmony goes on
  ancient items), as our server and C++ client have them. Serial, data and mini-games are Season 6's; the
  keys too, except `keyDefaults`, which frees our C++ client's window letters (H, K, S, Y, L, and N for the
  Mu Reforge menu) from the client actions that held them.
- `packets` (`packets/index.ts`): `ServerToClientPackets`, `ClientToServerPackets`,
  `ConnectServerPackets`, `ChangeMapServerInfoPacket`, `REPLACED_BY_EXTENDED` and `SAME_FRAME`.
- `packets/healthStatus.ts`: `ShowHealthStatusPacket`, the hand-written C1 ED 01.
- `packets/requestsState.ts`: `RequestsStatePacket`, the hand-written C1 E4 01 (requests allowed), read by
  `reforge_hud`.
- `packets/eventPackets.ts`: the hand-written event frames (C2 CC 01 invasion status, C1 E2 01 / 02
  TvT, C1 E3 01 / 03 Deep Dungeon, C1 DA 01 hunting log), read by the modules `invasions`, `tvt`,
  `deep_dungeon` and `hunt_log`. The event list (C1 97) is generated; `event_list` reads it.
- UI: the registry loads Season 6's (`../season6/ui`); there is no `ui/` here.

## How it works
- `packets/packetsDefinitions/*.xml` is a copy of our server's
  `src/Network/Packets/{ServerToClient,ClientToServer,ConnectServer}/*Packets.xml`;
  `bun run generate -- versions/reforge/packets` writes the three `*Packets.ts` beside them.
  The generator moves the packets our XML writes after `</Enums>` into the list.
- The server list is ours, minus:
  - the classic packets an `...Extended` sibling replaces at 106.3 (`REPLACED_BY_EXTENDED`);
  - the classes a same-length class already claims (`SAME_FRAME`: `ChaosCastleScore`);
  - the `...075` / `...095` / `...097` variants;
  - the anti-cheat frames on E7.
  That keeps dispatch unambiguous: one class per code and sub-code for every packet with an
  Extended form. Babylon's own frames are not in it: no `ModulePacket` (E8 is our Market), no
  token login or marketplace escrow (E7), no band relay (FA is our Item Collections). The
  map-server move and the proxy's ping relay are added as in Season 6, plus our ED 01.
- The handlers parse with the `versions/shared/packets` classes of the same name. Every packet M1
  reads (CharacterListExtended, ObjectWalkedExtended, MasterStatsUpdateExtended,
  ItemConsumptionFailedExtended, PlayerShop*Extended, the item lists) has the same layout in
  both XMLs; the packets whose layout differs are listed in "Not yet" below.
- `itemCodec: 'extended'` makes every item read go through `ItemSerializerExtended`
  (`src/controllers/item_rules/itemCodec.ts`) and moves items with `ItemMoveRequestExtended`
  (C3 07 24, no item bytes).
- Connect through the Open Source client's connect server, 44406 (the GMO client's is 44405).
- A local checkout plays the live servers with `start-prod.ps1` (`docs/reforge.md`). A world that
  points at a local `-demo` server must name the version (`VITE_CS_VERSION=REFORGE`): without it the
  world boots Season 6, which knows none of our numbers, and every NPC and monster of ours (650, 763,
  765-769, 603-612, 714-762) is drawn as the fallback Bull Fighter.
- `modulesOff`: `marketplace` sends Babylon's escrow request on C1 E7 01, which our server reads
  as its anti-cheat `GuardDetectionReport`. The token login only runs for a world whose
  `server.json` offers it, and our server has none.

## Protocol differences handled (M2)
- `AddLetter` is 107 bytes (60-byte subject at 46, state at 106): `modules/friends/net.ts` reads
  the wide form by length. `OpenLetterExtended` (message at 50) is handled there too.
- C1 93 / 29: our `ChaosCastleScore` is `BloodCastleScore` with Type 0xFE. `SAME_FRAME` keeps it
  out of the list; `modules/events/bloodCastle.ts` reads byte 4 and stores monster kills, exp and
  player kills, which the result box shows as the original's Chaos Castle box does.
- `LogoutResponse` type 255: logout refused in PvP. `modules/session/sessionExit.ts` ends the
  wait and keeps the hero in the world; the server sends the reason as a blue message.
- `QuestStateExtended` / `QuestProgressExtended` (C2, 272 bytes, 15-byte items): `modules/quests`.
- `AddTransformedCharactersToScopeExtended` (C2 45): `modules/scope/net.ts` `readTransformedExtended`.
- `ShowHealthStatus` (C1 ED 01, hand-written on the server, `packets/healthStatus.ts`): the watched
  monster's health bar, `modules/combat/net.ts`.
- Chat item links our server writes (`\x01` + item hex + `\x02`, ChatItemLinkExpander) are read with
  the extended codec (`modules/chat/chatItemLinks.ts`).
- Personal shop barter prices are decoded into `ShopStock.barter`.
- `CastleSiegeTaxRateInfo` (our name for B2 1A, same layout) feeds the tax like the classic one.
- C1 FA is our Item Collections (FA 01 C2 catalog, FA 02 C1 result). The proxy's band relay used
  the same code, so `band` is in `modulesOff` and no band class is listed. The proxy still sends
  its band hello (C1 FA 00) when tracking is on; it lands as "no packet: 0xFA" once a connection.
  The proxy also swallows every client C1 FA frame as a band frame: a future Item Collections
  request must not go through a proxy with the band relay on.

## Monsters, maps and data (our client's World/Reforge)
- `monsters/<name>/index.ts` (`defineMonster`, glob in `monsters/all.ts`, imported by `index.ts`
  after Season 6's): the 78 rows of our C++ client's `ReforgeMonsters.cpp`, its numbers, names,
  models and scales; `maxHealth` is the server's final value (raid boss tiers, arena, Deep Dungeon
  rosters; NPCs none). 57 are our own art, `Monster<file>.bmd` in slot `file - 1` (Monster218-349
  -> `Monster/Monster218.glb`...); the rest reuse a stock model (Deep Dungeon 705-713, flowers
  600-602, Lord of Kundun 604, golden 759-762, Fortress 767-769). The NPCs carry `npc: true`
  (talked to, never attacked, `ecs/systems/attackSystem.ts`); 523 (trap) is `hidden`. Malgruth's
  green glow is a `bodyFx` cards row; the golden four are classes in
  `versions/shared/monsters/_golden_line/model.ts`. Names: the folder's `Name` when the language
  pack has none (`monstersDatabase.ts`), and our `NpcName_Eng.txt` (ours plus
  `NpcName_Reforge_Eng.txt`) for English.
- Maps: `versions/shared/maps/teamvsteam` (server map 87, World88) and `deepdungeon` /
  `deepdungeonlower` (maps 90-94, World91-95), `ENUM_WORLD.WD_87TEAM_VS_TEAM` and
  `WD_90DEEP_DUNGEON1..WD_94DEEP_DUNGEON5`. Our client draws them with no case of its own (default
  light, sound and fog), so the entries are tile slots and the absent type 79. The Arena (map 6)
  is Season 6's `stadium` with our walk map.
- `data/` (`reforgeData`): Season 6's trees plus two of ours, borrowing every file they lack.
  `public/game-assets-reforge/` (`data/assets.ts`, 50 MB): our item models (`Item/`, `Player/`,
  `items/readme.md`), the 57 monster GLBs, World88 and
  World91-95 (terrain, tiles) with the object GLBs their `.obj` places, and our
  `World7/EncTerrain7.att` (118 Arena cells opened). `Data-reforge/` (`data/inventory.ts`, 14 MB):
  `MoveReq_eng.bmd` (our warp list, Fort entries), `NpcName_Eng.txt`, `Local/ItemAddOption.bmd` (the 380
  option on every piece the server grants it, socket sets and Tigris included), the World7/88/91-95
  minimaps, the map name banners `Local/Eng/ImgsMapName/TeamVsTeam.OZT` and `DeepDungeon1-5.OZT`
  (our Spn / Por copies are the same pictures, so the banner's English fallback serves them) and the
  Hero Cape's cloth texture `Item/Cape_Bronze25_0.OZT`. `worlds` adds 88 and 91-95;
  `tools/assetsIndex.ts` writes `assets-index-reforge.json`; `copy-data` copies `Data-reforge`.
- Converted with `MU_DATA=<client-next>/src/bin/Data GLB_OUTPUT=public/game-assets-reforge bun
  tools/bmdToGlb.ts Monster/Monster<n>.bmd ... Object88 Object91 ...`, then the object GLBs no
  `.obj` places removed; terrain files copied with the loader's spelling (`TerrainHeight.OZB`,
  `TerrainLight.OZJ`). Regenerate the two lists with the commands at their top.
- Map name banners: 87 and 90-94 are rows of the banner table (`versions/shared/ui/hud/map_name_banner`,
  `ReforgeMaps.cpp` `AddMapNameImages`); Season 6 never enters those maps.

## Not yet
- Our monsters and maps: sounds for our own art (our client sets none either), the Fortress
  Crystal's aurora, the golden bone names, the Fort Siege state on the fortresses (see "Lorencia's and Noria's Fort
  Siege fortresses" below), our gate.bmd (its new rows are Season 14 maps 83/95/96 only).
- Castle Siege: our B2 16-19 / B7 / B9 03 are other names and layouts (`CastleSiegeCrownState`,
  `CastleSiegeRegimentState`, `CastleSiegeMachineUseResult`, `CastleSiegeHuntingZoneInfo`, ...).
  Babylon has no siege UI that reads them, so they arrive as unhandled packets, never misread.
- Barter prices are not shown: our server writes none yet (`ShowShopItemListExtendedPlugIn` todo);
  the tooltip takes a zen number only.
- Babylon's own chat links (`{base64}`, 12-byte item) still go out as typed; our C++ client shows
  them as text. Sending the server's slot token is not done.
- Enum values new in our XML (`UpdateMiniGameState` 16-19 Doppelganger, `NpcWindow` 13 GuardsMan)
  are wire-compatible: the first is ignored, the second gets the "nothing yet" path.
- Every fork feature packet (VIP, banks, market, events): M3-M5.

## Lorencia's and Noria's Fort Siege fortresses
Our `World1` / `World4` are not Season 6's: `EncTerrain<n>.att`, `.map`, `.obj` and `TerrainHeight.OZB`
differ (`TerrainLight.OZJ`, the tiles and the minimap are the same bytes). Ported as:
- Terrain: those four files and `ExtTile01.OZJ` in `public/game-assets-reforge/World1/` and `World4/`;
  `borrows.ownAssets` makes them win over Season 6's for Mu Reforge only.
- Tiles: our `.map` paints slot 14, `ExtTile01` (the `ExtTile` loop, MapManager.cpp:1452-1459): 674
  cells in Lorencia, 679 in Noria. The per-version tile list is `VersionData.maps` (`src/version/contract.ts`),
  rows `maps.layerFor` merges over the shared entry for this version only (`maps/index.ts` here):
  Lorencia gets 15 slots (9-13 name `TileRock02`, none painted), Noria 15 (11-13 name `TileRock04`).
  Season 6 has no `maps`, so its lists, requests and rows are unchanged.
- Lorencia's models: `Object1/Fort01-19.bmd` converted as `Object1/Fort<nn>.glb`, placed in the slots
  `ReforgeMaps.cpp` `LorenciaFortModelSlots` names through the new `MapLayer.objectModels` (type -> file),
  which `MapTileObject` reads (`maps.objectModelFor`). Fort10 (slot 139) is placed nowhere in our `.obj`,
  so it is not shipped. Noria's are `Object4/Object51-78.bmd` (types 50-77), found by the generic
  `Object<type + 1>` name; Object63 is placed nowhere and not shipped.
- `ReforgeFortObjects.cpp` furniture: the council chair, hall chair and hall bench are seats facing the
  object's way (`terrain.rest`, Lorencia 159/154/155, Noria 71/75/76), the hall candelabra's mesh 1 is
  additive (`blendMeshes`, Lorencia 156, Noria 77).
- Walk map: the cells of our `EncTerrain1.att` / `EncTerrain4.att` equal the server's `Terrain1.att` /
  `Terrain4.att` (`Persistence/Initialization/Resources`) inside the fort areas `AddFortSiegeUpdateSeason6`
  copies; Noria is identical everywhere. Lorencia keeps 236 cells outside the fort where every Season 6
  client already differs from OpenMU's file (map edge, mostly client-blocked).
- Converted with `MU_DATA=<client-next>/src/bin/Data GLB_OUTPUT=<scratch> bun tools/bmdToGlb.ts
  Object1/Fort01.bmd ... Object4/Object51.bmd ...`, then the GLBs no `.obj` places removed.

Not yet: the siege-state behaviour (the gate placed and turned to the camera, the hall furniture hidden
during a battle, the Life Stone drawn built) is driven by our Fort Siege packets
(`GameLogic/Reforge/ReforgeFortSiege`), which Babylon does not read; outside a battle the hall shows, as
in our client.

## Depends on / used by
- uses: `../season6` (game version, hand-written packets, UI), `versions/shared/packets`
  (the classes the handlers read)
- used by: `versions/registry.ts`

## Change it
- our XML changed: recopy the three files into `packets/packetsDefinitions/` and run
  `bun run generate -- versions/reforge/packets`.
- a packet our server sends at 106.3 replaces a classic one: add the classic name to
  `REPLACED_BY_EXTENDED` and handle the Extended one in its module's `net.ts`.

## Tests
- `monsters/monsters.test.ts`: the 78 rows, the 57 own-art GLBs exist, every row resolves to its own body
  (never the Bull Fighter fallback) and the stock bodies exist, scales, NPCs, names.
- `data/data.test.ts`: the two lists match their trees, own files and borrowed ones resolve, every
  terrain file and tile slot of our worlds exists; Season 6's Lorencia / Noria tile lists unchanged,
  ours carry `ExtTile01` at 14 and cover every slot our `.map` paints, every fort model and Noria type
  resolves, the seats and candelabra rows.
- `reforge.test.ts`: the login bytes, the Season 6 keys and our window letters, E4 01, the item codec, the variant ranks, no
  replaced or old-client packet in the set, nothing on E7, only the Market on E8, one class at
  each code M1 and M2 read, nothing on FA.
- M2 handlers, with byte fixtures written from the C# senders: `modules/friends/letters.test.ts`,
  `events/chaosCastleScore.test.ts`, `session/sessionExit.test.ts`, `quests/questExtended.test.ts`,
  `scope/transformedExtended.test.ts`, `combat/healthStatus.test.ts`,
  `chat/chatItemLinksServer.test.ts`, `personal_shop/barterPrice.test.ts`.
