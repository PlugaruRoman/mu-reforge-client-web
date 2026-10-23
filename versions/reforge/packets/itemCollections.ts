/**
 * C1/C2 FA - Mu Reforge's Item Collections, hand-written on our server (no XML):
 * S GameServer/RemoteView/ItemCollections/ItemCollectionViewPlugIn.cs (FA 01 catalog, FA 02 register
 * answer) and S GameServer/MessageHandler/ItemCollections/*.cs (FA 01 list request, FA 02 register).
 * Our client reads them in Network/Reforge/ItemCollectionPackets.cpp. The proxy passes client FA frames
 * to the server only with `BAND=off` (proxy/clientFrames.ts).
 */

/**
 * C2 FA 01, the catalog with the account's progress: `[C2][len u16 BE][FA][01][count]`, then per
 * collection `[number u16 LE][category][slotCount][bonusCount][nameLength][name ASCII]`, `slotCount`
 * slots of 7 bytes `[group][number u16 LE][minLevel][flags][excellentMask][minOptionLevel]` and
 * `bonusCount` bonuses of 5 bytes `[type][value i32 LE, hundredths]` (ItemCollectionViewPlugIn.cs:47-111).
 */
export class ItemCollectionListPacket {
  buffer!: DataView;
  static readonly Name = 'ItemCollectionList';
  static readonly HeaderType = 'C2HeaderWithSubCode';
  static readonly HeaderCode = 0xc2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'The player opened the Item Collections window, and after an item was registered.';
  static readonly CausedReaction = 'The window shows the collections, their slots and bonuses.';
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xfa;
  static readonly SubCode = 0x01;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}

/**
 * C1 FA 02, the answer to a register request: `[C1][08][FA][02][result][collection u16 LE][slot]`
 * (ItemCollectionViewPlugIn.cs:114-139). Result: S GameLogic/ItemCollections/ItemCollectionRegisterResult.cs.
 */
export class ItemCollectionRegisterResultPacket {
  buffer!: DataView;
  static readonly Name = 'ItemCollectionRegisterResult';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'After the player asked to register an item into a collection.';
  static readonly CausedReaction = 'The client plays the success sound or says why it was refused.';
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xfa;
  static readonly SubCode = 0x02;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }

  get Result() {
    return this.buffer.getUint8(4);
  }

  get Collection() {
    return this.buffer.getUint16(5, true);
  }

  get Slot() {
    return this.buffer.getUint8(7);
  }
}

export const ITEM_COLLECTION_PACKETS = [ItemCollectionListPacket, ItemCollectionRegisterResultPacket] as const;
