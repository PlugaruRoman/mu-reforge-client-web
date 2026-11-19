/**
 * C1 ED 02 - the remaining time and the values of one of the hero's own effects, sent on every activation
 * and renewal of it. Hand-written on our server (S GameServer/RemoteView/World/MagicEffectValuesPacket.cs),
 * not in its XML: `[C1][len][ED][02][effectNumber u16 LE][remainingSeconds u32 LE][count]`, then `count` x
 * `[kind][unit][value i32 LE]` from 11 - unit 0 is a number, 1 a percent; 0 seconds means the effect has no
 * countdown (a fortress owner's buff, the GM mark). Our client reads it in Network/Reforge/BuffValuePackets.cpp.
 * Read by `src/modules/skills/net.ts`.
 */
export class BuffValuesPacket {
  static readonly Name = 'BuffValues';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xed;
  static readonly SubCode = 0x02;
  constructor(readonly buffer: DataView) {}
}

/** One value of the packet: `kind` is the server's MagicEffectValuesPacket.ValueKind (append only). */
export interface BuffValue {
  kind: number;
  percent: boolean;
  amount: number;
}

const HEADER_LENGTH = 11;
const VALUE_LENGTH = 6;

/** The effect, its seconds and its values; a value past the frame's end ends the list. Null when too short. */
export function readBuffValues(view: DataView): { effect: number; seconds: number; values: BuffValue[] } | null {
  if (view.byteLength < HEADER_LENGTH) return null;
  const effect = view.getUint16(4, true);
  const seconds = view.getUint32(6, true);
  const count = view.getUint8(10);
  const values: BuffValue[] = [];
  for (let i = 0; i < count; i++) {
    const at = HEADER_LENGTH + i * VALUE_LENGTH;
    if (at + VALUE_LENGTH > view.byteLength) break;
    values.push({ kind: view.getUint8(at), percent: view.getUint8(at + 1) === 1, amount: view.getInt32(at + 2, true) });
  }
  return { effect, seconds, values };
}
