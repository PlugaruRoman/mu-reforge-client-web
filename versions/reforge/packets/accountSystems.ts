/**
 * Our server's hand-written frames of the VIP shop (D7), the resets and auto stat (D9) and the Soul
 * Point system (DE), read by `src/modules/vip`, `resets` and `soul_points`, listed by `index.ts`.
 * None is in the server's XML; the layouts are the C# writers' (cited per class). All numbers are
 * little endian. Our client reads them in Network/Reforge/{Vip,Reset,SoulPoint}Packets.cpp.
 */

const u16 = (b: DataView, at: number) => b.getUint16(at, true);
const u32 = (b: DataView, at: number) => b.getUint32(at, true);

/** A C1 frame with a sub-code: the fields every packet class of the dispatcher carries. */
abstract class Frame {
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  constructor(readonly buffer: DataView) {}
}

/**
 * D7 01, 40 bytes (S RemoteView/Vip/VipViewPlugIn.cs `ShowVipStatusAsync`): the seconds left of the
 * four tiers at 4, the W Coin (C) at 20, the four prices at 24.
 */
export class VipStatusPacket extends Frame {
  static readonly Name = 'VipStatus';
  static readonly Length = 40;
  static readonly Code = 0xd7;
  static readonly SubCode = 0x01;
  get Remaining(): number[] { return [0, 1, 2, 3].map(i => u32(this.buffer, 4 + i * 4)); }
  get WCoin() { return u32(this.buffer, 20); }
  get Prices(): number[] { return [0, 1, 2, 3].map(i => u32(this.buffer, 24 + i * 4)); }
}

/** D7 02, 25 bytes (`ShowVipBuyResultAsync`): the result at 4, the four times at 5, the W Coin at 21. */
export class VipBuyResultPacket extends Frame {
  static readonly Name = 'VipBuyResult';
  static readonly Length = 25;
  static readonly Code = 0xd7;
  static readonly SubCode = 0x02;
  get Result() { return this.buffer.getUint8(4); }
  get Remaining(): number[] { return [0, 1, 2, 3].map(i => u32(this.buffer, 5 + i * 4)); }
  get WCoin() { return u32(this.buffer, 21); }
}

/**
 * D9 01, 14 bytes (S RemoteView/Reset/ResetInfoViewPlugIn.cs `ShowResetInfoAsync`):
 * `[canReset][reason][level u16][zen u32][resets u16]` from 4.
 */
export class ResetInfoPacket extends Frame {
  static readonly Name = 'ResetInfo';
  static readonly Length = 14;
  static readonly Code = 0xd9;
  static readonly SubCode = 0x01;
  get CanReset() { return this.buffer.getUint8(4) !== 0; }
  get Reason() { return this.buffer.getUint8(5); }
  get RequiredLevel() { return u16(this.buffer, 6); }
  get RequiredZen() { return u32(this.buffer, 8); }
  get CurrentResets() { return u16(this.buffer, 12); }
}

/**
 * D9 02, 20 bytes (`ShowGrandResetInfoAsync`): `[canReset][reason][resets u16][level u16][zen u32]
 * [grand resets u16][resets u16][limit u16]` from 4; a limit of 0 is none.
 */
export class GrandResetInfoPacket extends Frame {
  static readonly Name = 'GrandResetInfo';
  static readonly Length = 20;
  static readonly Code = 0xd9;
  static readonly SubCode = 0x02;
  get CanReset() { return this.buffer.getUint8(4) !== 0; }
  get Reason() { return this.buffer.getUint8(5); }
  get RequiredResets() { return u16(this.buffer, 6); }
  get RequiredLevel() { return u16(this.buffer, 8); }
  get RequiredZen() { return u32(this.buffer, 10); }
  get CurrentGrandResets() { return u16(this.buffer, 14); }
  get CurrentResets() { return u16(this.buffer, 16); }
  get Limit() { return u16(this.buffer, 18); }
}

/**
 * D9 03 (stats) / D9 05 (master tree), 35 bytes (`SendCostInfoAsync`): balances W Coin, Bless, Soul,
 * costs W Coin, Bless, Soul, the refundable points (u32 each, from 4), the level u16 at 32, the
 * precondition (StatResetResult / MasterResetResult) at 34.
 */
abstract class PaidResetInfo extends Frame {
  static readonly Length = 35;
  static readonly Code = 0xd9;
  get Balances(): number[] { return [0, 1, 2].map(i => u32(this.buffer, 4 + i * 4)); }
  get Costs(): number[] { return [0, 1, 2].map(i => u32(this.buffer, 16 + i * 4)); }
  get RefundablePoints() { return u32(this.buffer, 28); }
  get RequiredLevel() { return u16(this.buffer, 32); }
  get Precondition() { return this.buffer.getUint8(34); }
}

export class StatResetInfoPacket extends PaidResetInfo {
  static readonly Name = 'StatResetInfo';
  static readonly SubCode = 0x03;
}

export class MasterResetInfoPacket extends PaidResetInfo {
  static readonly Name = 'MasterResetInfo';
  static readonly SubCode = 0x05;
}

/** D9 04 / D9 06, 5 bytes (`SendResultAsync`): the result at 4. */
abstract class PaidResetResult extends Frame {
  static readonly Length = 5;
  static readonly Code = 0xd9;
  get Result() { return this.buffer.getUint8(4); }
}

export class StatResetResultPacket extends PaidResetResult {
  static readonly Name = 'StatResetResult';
  static readonly SubCode = 0x04;
}

export class MasterResetResultPacket extends PaidResetResult {
  static readonly Name = 'MasterResetResult';
  static readonly SubCode = 0x06;
}

/**
 * D9 07, 13 bytes (S RemoteView/Character/AutoStatConfigurationViewPlugIn.cs): `[enabled][interval]
 * [str agi vit ene cmd %]` from 4, the points a level up gives (u16) at 11.
 */
export class AutoStatConfigurationPacket extends Frame {
  static readonly Name = 'AutoStatConfiguration';
  static readonly Length = 13;
  static readonly Code = 0xd9;
  static readonly SubCode = 0x07;
  get Enabled() { return this.buffer.getUint8(4) !== 0; }
  get Interval() { return this.buffer.getUint8(5); }
  get Percents(): number[] { return [0, 1, 2, 3, 4].map(i => this.buffer.getUint8(6 + i)); }
  get PointsPerLevelUp() { return u16(this.buffer, 11); }
}

/**
 * DE 01, variable (S RemoteView/SoulPoints/SoulPointViewPlugIn.cs `ShowSoulPointInfoAsync`): the free
 * points u32 at 4, the slot count at 8, 5-byte slots `[type][points u16][cap u16]` from 9, then the
 * balances and costs of the three payments (W Coin C, W Coin P, Bless; u32 each).
 */
export class SoulPointInfoPacket extends Frame {
  static readonly Name = 'SoulPointInfo';
  static readonly Code = 0xde;
  static readonly SubCode = 0x01;
  get Available() { return u32(this.buffer, 4); }
  get Count() { return this.buffer.getUint8(8); }
  get Slots(): { type: number; points: number; cap: number }[] {
    const count = Math.min(this.Count, Math.floor((this.buffer.byteLength - 9 - 24) / 5));
    return Array.from({ length: Math.max(0, count) }, (_, i) => {
      const at = 9 + i * 5;
      return { type: this.buffer.getUint8(at), points: u16(this.buffer, at + 1), cap: u16(this.buffer, at + 3) };
    });
  }
  private get trailer() { return 9 + this.Count * 5; }
  get Balances(): number[] { return [0, 1, 2].map(i => u32(this.buffer, this.trailer + i * 4)); }
  get Costs(): number[] { return [0, 1, 2].map(i => u32(this.buffer, this.trailer + 12 + i * 4)); }
}

/** DE 03, 5 bytes (`ShowSoulResetResultAsync`): the SoulResetResult at 4. */
export class SoulPointResetResultPacket extends Frame {
  static readonly Name = 'SoulPointResetResult';
  static readonly Length = 5;
  static readonly Code = 0xde;
  static readonly SubCode = 0x03;
  get Result() { return this.buffer.getUint8(4); }
}

export const ACCOUNT_SYSTEM_PACKETS = [
  VipStatusPacket,
  VipBuyResultPacket,
  ResetInfoPacket,
  GrandResetInfoPacket,
  StatResetInfoPacket,
  StatResetResultPacket,
  MasterResetInfoPacket,
  MasterResetResultPacket,
  AutoStatConfigurationPacket,
  SoulPointInfoPacket,
  SoulPointResetResultPacket,
] as const;
