/**
 * C2 D8 04 - the effects of every party member, in party list order
 * (S GameServer/RemoteView/Party/PartyMemberBuffsViewPlugIn.cs, hand-written):
 * `[memberCount]` x `[buffCount][buff ids...]`. Read by `modules/reforge_hud/net.ts`; our client
 * reads it in Network/Reforge/HudPackets.cpp `DecodePartyMemberBuffs`.
 */
export class PartyMemberBuffsPacket {
  buffer!: DataView;
  static readonly Name = 'PartyMemberBuffs';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'A party member gained or lost an effect, or the party changed.';
  static readonly CausedReaction = 'The party list shows each member\'s effects.';
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xd8;
  static readonly SubCode = 0x04;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}
