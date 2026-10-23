/**
 * C2 EE 01 - the board of the Olympiad's Battle Statue window. Hand-written on our server
 * (S GameServer/RemoteView/Olympiad/OlympiadViewPlugIn.cs), not in its XML: a 43-byte status after
 * the 5-byte header, then four counted lists (rewards, Heroes, matches, token shop). Read by
 * `modules/olympiad/board.ts`; our client reads it in Network/Reforge/OlympiadPackets.cpp.
 */
export class OlympiadBoardPacket {
  buffer!: DataView;
  static readonly Name = 'OlympiadBoard';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'The player opened the Battle Statue window or acted in it.';
  static readonly CausedReaction = 'The Olympiad window shows the board.';
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xee;
  static readonly SubCode = 0x01;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/**
 * C2 E0 01 - the Death Records list (S GameServer/RemoteView/DeathRecords/DeathRecordsViewPlugIn.cs):
 * `[count]` then 130-byte records. Asked for with C1 E0 01 (`DeathRecordsRequestHandlerPlugIn`).
 */
export class DeathRecordsPacket {
  buffer!: DataView;
  static readonly Name = 'DeathRecords';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'The player asked for the Death Records.';
  static readonly CausedReaction = 'The Death Records window lists who killed the player.';
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xe0;
  static readonly SubCode = 0x01;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}
