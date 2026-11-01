/**
 * Our server's hand-written Party Search frames (head code D8), read by `src/modules/party_search`,
 * listed in the packet set by `index.ts`. None is in the server's XML; the layouts are
 * S GameServer/RemoteView/Party/PartySearchViewPlugIn.cs's (strings UTF-8, zero padded; numbers
 * little endian). Our client reads them in Network/Reforge/PartySearchPackets.cpp. D8 04 from the
 * server is the party members' buffs (`./partyMemberBuffs.ts`), not a Party Search frame.
 */

/** C1 D8 01, 20 bytes (`ShowSearchStatusAsync`): `[result][active][maxLevel u16][classMask][flags][password:10]` from 4. */
export class PartySearchStatusPacket {
  static readonly Name = 'PartySearchStatus';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly Length = 20;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xd8;
  static readonly SubCode = 0x01;
  constructor(readonly buffer: DataView) {}
}

/**
 * C2 D8 02 (`ShowOpenPartiesAsync`): `[count]` from 5, then `count` x 16 bytes
 * `[masterName:10][map][x][y][members][maxMembers][hasPassword]` from 6.
 */
export class PartySearchListPacket {
  static readonly Name = 'PartySearchList';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = 'ServerToClient';
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xd8;
  static readonly SubCode = 0x02;
  constructor(readonly buffer: DataView) {}
}

/** C1 D8 03, 5 bytes (`ShowJoinResultAsync`): `[result]` at 4 (S PartySearchJoinResult). */
export class PartySearchJoinResultPacket {
  static readonly Name = 'PartySearchJoinResult';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xd8;
  static readonly SubCode = 0x03;
  constructor(readonly buffer: DataView) {}
}

export const PARTY_SEARCH_PACKETS = [PartySearchStatusPacket, PartySearchListPacket, PartySearchJoinResultPacket] as const;
