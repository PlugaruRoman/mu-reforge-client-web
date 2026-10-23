/**
 * C1 E8 06 - the currencies of a personal store's priced items, hand-written on our server
 * (S GameServer/RemoteView/Market/MarketViewPlugIn.cs ShowStoreCurrenciesAsync), not in its XML:
 * `[C1][len][E8][06][count]` then one `(slot, currency)` pair per item. Our client reads it in
 * Network/Reforge/MarketPackets.cpp (`ParseStoreCurrencies`); `modules/reforge_market/codec.ts` here.
 */
export class MarketStoreCurrenciesPacket {
  buffer!: DataView;
  static readonly Name = 'MarketStoreCurrencies';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'A personal store the player looks at has items priced in other currencies than zen.';
  static readonly CausedReaction = 'The client knows what each store slot price is paid in.';
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xe8;
  static readonly SubCode = 0x06;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}
