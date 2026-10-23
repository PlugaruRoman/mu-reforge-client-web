/**
 * The Fort Siege frames (C1/C2 EF), hand-written on our server
 * (S GameServer/RemoteView/FortSiege/FortSiegeViewPlugIn.cs), not in its XML. Read by
 * `modules/fort_siege/net.ts`; our client reads them in Network/Reforge/FortSiegePackets.cpp.
 */

/** EF 01: `[count]` x `[side][guild:8]`, then the battle area `[x1][y1][x2][y2]`. */
export class FortSiegeSidesPacket {
  buffer!: DataView;
  static readonly Name = 'FortSiegeSides';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xef;
  static readonly SubCode = 0x01;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** EF 02 (23 bytes): `[state][remainingMs u32][totalMs u32][name:10]`, the capturer's own state. */
export class FortCaptureStatePacket {
  buffer!: DataView;
  static readonly Name = 'FortCaptureState';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly Length = 23;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xef;
  static readonly SubCode = 0x02;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** EF 03: `[count]` x `[warpIndex][allowed]`, then `[exp%][drop%][zenTax%]`. */
export class FortWarpsPacket {
  buffer!: DataView;
  static readonly Name = 'FortWarps';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xef;
  static readonly SubCode = 0x03;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** EF 04 (C2): the Fortress Herald's registration state. */
export class FortRegistrationStatePacket {
  buffer!: DataView;
  static readonly Name = 'FortRegistrationState';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = 'ServerToClient';
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xef;
  static readonly SubCode = 0x04;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** EF 05 (27 bytes): `[active][guild:8][player:10][remainingMs u32]`, the crystal capture line. */
export class FortCaptureLinePacket {
  buffer!: DataView;
  static readonly Name = 'FortCaptureLine';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly Length = 27;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xef;
  static readonly SubCode = 0x05;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** EF 06 (C2): `[count u16]` x `[side][name:10]`, the fighters of the battle. */
export class FortFightersPacket {
  buffer!: DataView;
  static readonly Name = 'FortFighters';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = 'ServerToClient';
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xef;
  static readonly SubCode = 0x06;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}
