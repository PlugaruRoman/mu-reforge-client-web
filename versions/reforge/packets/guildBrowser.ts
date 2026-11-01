/**
 * Our server's hand-written guild browser frames (head code DC, the guild bank's), read by the module
 * `guild_browser`, listed in the packet set by `index.ts`. None is in the server's XML; the layouts are
 * S GameServer/RemoteView/Guild/GuildWarListViewPlugIn.cs (DC 10), GuildAllianceRequestViewPlugIn.cs
 * (DC 11) and GuildAllianceListViewPlugIn.cs (DC 12). Our client reads them in
 * Network/Reforge/GuildPackets.cpp. These classes only let the dispatcher name each frame; the module
 * parses the bytes (`src/modules/guild_browser/state.ts`).
 */
const SERVER = 'ServerToClient' as const;

/**
 * C2 DC 10, the Guild Wars list: `[state][warType][ownScore][enemyScore][maxScore][otherGuild:9][count]`
 * from 5, then `count` x 56 bytes from 20.
 */
export class GuildWarListPacket {
  buffer!: DataView;
  static readonly Name = 'GuildWarList';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = SERVER;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xdc;
  static readonly SubCode = 0x10;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/** C1 0D DC 11, another guild master asks the hero's guild into an alliance by name: `[guildName:9]` from 4. */
export class GuildAllianceRequestByNamePacket {
  buffer!: DataView;
  static readonly Name = 'GuildAllianceRequestByName';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = SERVER;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xdc;
  static readonly SubCode = 0x11;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/**
 * C2 DC 12, the Guild Alliance list: `[state][isAllianceMaster][allianceSize][otherGuild:9][count]` from 5,
 * then `count` x 56 bytes from 18.
 */
export class GuildAllianceListPacket {
  buffer!: DataView;
  static readonly Name = 'GuildAllianceList';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = SERVER;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xdc;
  static readonly SubCode = 0x12;
  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

export const GUILD_BROWSER_PACKETS = [GuildWarListPacket, GuildAllianceRequestByNamePacket, GuildAllianceListPacket];
