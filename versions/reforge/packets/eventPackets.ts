/**
 * Our server's hand-written event frames (no XML): the invasion status (C2 CC 01), Team vs Team
 * (C1 E2 01 / 02), the Deep Dungeon (C1 E3 01 / 03) and the hunting log (C1 DA 01). The modules
 * `invasions`, `tvt`, `deep_dungeon` and `hunt_log` read the bytes; these classes only let the
 * dispatcher name each frame. Layouts: the S GameServer/RemoteView file cited on each class.
 */
const SERVER = 'ServerToClient' as const;

/** S RemoteView/Invasions/InvasionStatusViewPlugIn.cs: `[C2][len u16 BE][CC][01][count]` + 31-byte entries. */
export class InvasionStatusPacket {
  buffer!: DataView;
  static readonly Name = 'InvasionStatus';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = SERVER;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xcc;
  static readonly SubCode = 0x01;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** S RemoteView/Tvt/TvtScoreViewPlugIn.cs `ShowTvtScoreAsync`: 13 bytes + 3 per fighter. */
export class TvtScorePacket {
  buffer!: DataView;
  static readonly Name = 'TvtScore';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = SERVER;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xe2;
  static readonly SubCode = 0x01;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** S RemoteView/Tvt/TvtScoreViewPlugIn.cs `ShowTvtRegistrationAsync`: `[C1][05][E2][02][open]`. */
export class TvtRegistrationPacket {
  buffer!: DataView;
  static readonly Name = 'TvtRegistration';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = SERVER;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xe2;
  static readonly SubCode = 0x02;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** S RemoteView/DeepDungeon/DeepDungeonViewPlugIn.cs `ShowFloorSelectionAsync`: 10 bytes (8 in its first form). */
export class DeepDungeonFloorSelectionPacket {
  buffer!: DataView;
  static readonly Name = 'DeepDungeonFloorSelection';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = SERVER;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xe3;
  static readonly SubCode = 0x01;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** S RemoteView/DeepDungeon/DeepDungeonViewPlugIn.cs `UpdateCountdownAsync`: `[C1][07][E3][03][floor][seconds u16 LE]`. */
export class DeepDungeonCountdownPacket {
  buffer!: DataView;
  static readonly Name = 'DeepDungeonCountdown';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = SERVER;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xe3;
  static readonly SubCode = 0x03;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** S RemoteView/Hunt/HuntLogViewPlugIn.cs: 80 bytes, every number little endian. */
export class HuntLogInfoPacket {
  buffer!: DataView;
  static readonly Name = 'HuntLogInfo';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = SERVER;
  static readonly Length = 80;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xda;
  static readonly SubCode = 0x01;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** Every frame above, for the reforge server list (`./index.ts`). */
export const EVENT_PACKETS = [
  InvasionStatusPacket,
  TvtScorePacket,
  TvtRegistrationPacket,
  DeepDungeonFloorSelectionPacket,
  DeepDungeonCountdownPacket,
  HuntLogInfoPacket,
] as const;
