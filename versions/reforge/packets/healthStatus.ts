/**
 * C1 ED 01 - a monster's remaining health, sent to the players who watch it without hitting it.
 * Hand-written on our server (S GameServer/RemoteView/World/ShowHealthStatusPlugIn.cs), not in
 * its XML: `[C1][07][ED][01][id u16 big endian][status]`, the status in 1/250 of the maximum like
 * `ObjectHitExtended.HealthStatus`, 0xFF unknown. Our client reads it in
 * Network/Reforge/HudPackets.cpp (`DecodeHealthStatus`, `HandleHealthStatus`).
 */
export class ShowHealthStatusPacket {
  buffer!: DataView;
  static readonly Name = 'ShowHealthStatus';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'A monster the player watches, but does not hit, lost or regained health.';
  static readonly CausedReaction = 'The monster health bar shows the new share.';
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xed;
  static readonly SubCode = 0x01;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }

  get ObjectId() {
    return this.buffer.getUint16(4, false);
  }

  get HealthStatus() {
    return this.buffer.getUint8(6);
  }
}
