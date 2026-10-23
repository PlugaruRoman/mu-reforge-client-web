import { Session } from '../session';

/**
 * C1 04 D2 60: asks for the price of one more inventory bag (our client's
 * Network/Reforge/InventoryExtensionPackets.cpp; S CashShop/InventoryExtensionPriceRequestHandlerPlugIn.cs,
 * a sub code the original never used). The server answers with D2 60 (`XShop.bagPrice`).
 */
export function bagPriceRequest(): Uint8Array {
  return Uint8Array.from([0xc1, 0x04, 0xd2, 0x60]);
}

export function requestBagPrice(): void {
  Session.sendToGS(new DataView(bagPriceRequest().buffer));
}
