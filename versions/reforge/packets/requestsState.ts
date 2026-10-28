/**
 * C1 E4 01 - whether the hero accepts trade, party, duel and friend requests
 * (S GameServer/RemoteView/Character/RequestsBlockedViewPlugIn.cs, hand-written): `[allowed]` at 4.
 * Sent on entering the world and after every `/requests on|off`. Read by `modules/reforge_hud/net.ts`;
 * our client reads it in GameLogic/Reforge/ReforgeRequests.h.
 */
export class RequestsStatePacket {
  buffer!: DataView;
  static readonly Name = 'RequestsState';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'The hero entered the world, or changed whether requests are allowed.';
  static readonly CausedReaction = 'The client shows whether requests are allowed.';
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xe4;
  static readonly SubCode = 0x01;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}
