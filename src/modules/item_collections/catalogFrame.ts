/**
 * Test fixture: a C2 FA 01 catalog written the way ItemCollectionViewPlugIn.ShowItemCollectionsAsync
 * writes it (S GameServer/RemoteView/ItemCollections/ItemCollectionViewPlugIn.cs:62-108).
 * Slots are `[group][number u16 LE][minLevel][flags][excellentMask][minOptionLevel]`.
 */
export function catalogFrame(
  collections: { number: number; category: number; name: string; slots: number[][]; bonuses: [number, number][] }[]
): DataView {
  const body: number[] = [collections.length];
  for (const c of collections) {
    body.push(c.number & 0xff, c.number >> 8, c.category, c.slots.length, c.bonuses.length, c.name.length);
    for (const ch of c.name) body.push(ch.charCodeAt(0));
    for (const s of c.slots) body.push(...s);
    for (const [type, value] of c.bonuses) body.push(type, value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >>> 24) & 0xff);
  }
  const length = 5 + body.length;
  return new DataView(Uint8Array.from([0xc2, length >> 8, length & 0xff, 0xfa, 0x01, ...body]).buffer);
}
