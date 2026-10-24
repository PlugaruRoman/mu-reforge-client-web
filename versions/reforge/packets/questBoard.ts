/**
 * Our server's hand-written quest board frames (no XML), read by the module `quest_board`. Layout:
 * S GameServer/RemoteView/Quest/QuestBoardViewPlugIn.cs, `[C2][len u16 BE][DF][sub][count]` + 100
 * bytes a quest. These classes only let the dispatcher name each frame.
 */
const SERVER = 'ServerToClient' as const;

/** DF 01: the board of the hero's map (talk to Captain Slough, DF 01, after an accept or claim). */
export class QuestBoardListPacket {
  buffer!: DataView;
  static readonly Name = 'QuestBoardList';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = SERVER;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xdf;
  static readonly SubCode = 0x01;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** DF 05: the active quests of every chain (answer to DF 04). */
export class QuestBoardActiveListPacket {
  buffer!: DataView;
  static readonly Name = 'QuestBoardActiveList';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = SERVER;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xdf;
  static readonly SubCode = 0x05;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

export const QUEST_BOARD_PACKETS = [QuestBoardListPacket, QuestBoardActiveListPacket];
