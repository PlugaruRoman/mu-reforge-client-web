import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadGameVersion } from '@/version';
import { minItemLength, readItem, readItemData, readItemList } from './itemCodec';

const view = (bytes: number[]) => new DataView(Uint8Array.from(bytes).buffer);
/** The 12-byte item of 0/5 +0 at durability 20 (ItemSerializer). */
const STANDARD_ITEM = [0x05, 0x00, 20, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff];

describe('item codec: standard (Season 6)', () => {
  it('reads 12-byte items at a 1 + 12 stride', () => {
    // C4 F3 10 with two slot + item entries from 6.
    const packet = view([0xc4, 0, 32, 0xf3, 0x10, 2, 3, ...STANDARD_ITEM, 7, ...STANDARD_ITEM]);
    const list = readItemList(packet, 6, 2, 1);
    expect(list.map(e => e.at)).toEqual([6, 19]);
    expect(list.map(e => packet.getUint8(e.at))).toEqual([3, 7]);
    expect(list[1].item).toMatchObject({ group: 0, num: 5, durability: 20 });
    expect(minItemLength()).toBe(12);
  });
});

describe('item codec: extended (Mu Reforge)', () => {
  beforeAll(() => loadGameVersion('reforge'));
  afterAll(() => loadGameVersion('season6'));

  it('walks a C4 F3 10 inventory of items of three lengths', () => {
    // S RemoteView/Inventory/UpdateInventoryListPlugIn.cs:59-82: slot, then the item, back to back.
    const packet = view([
      0xc4, 0, 0, 0xf3, 0x10, 3,
      0, 0x00, 0x01, 0, 20, 0x00, // slot 0: Short Sword, 5 bytes
      12, 0x00, 0x05, 13, 80, 0x0f, 0x04, 0x3f, // slot 12: +13 exc, 7 bytes
      20, 0x00, 26, 7, 64, 0x84, 0xf3, 51, 0xfe, 10, // slot 20: three sockets, 9 bytes
    ]);
    const list = readItemList(packet, 6, 3, 1);
    expect(list.map(e => e.at)).toEqual([6, 12, 20]);
    expect(list.map(e => packet.getUint8(e.at))).toEqual([0, 12, 20]);
    expect(list.map(e => e.item.num)).toEqual([1, 5, 26]);
    expect(list[2].item.sockets).toEqual([51, 0xfe, 10]);
  });

  it('walks drops with a 4-byte head (id, x, y)', () => {
    // C2 20: S RemoteView/World/ShowDroppedItemsPlugIn.cs:40-70.
    const packet = view([0xc2, 0, 0, 0x20, 2, 0x80, 0x10, 130, 140, 0xd0, 0x25, 0, 255, 0x08, 0x04, 0x00, 0x11, 131, 141, 0x00, 0x01, 0, 20, 0x00]);
    const list = readItemList(packet, 5, 2, 4);
    expect(list.map(e => e.at)).toEqual([5, 15]);
    expect(list.map(e => packet.getUint16(e.at, false) & 0x7fff)).toEqual([0x10, 0x11]);
    expect(list[0].item).toMatchObject({ group: 13, num: 37, excellentFlags: 0x04 });
  });

  it('stops at the end of a short packet instead of reading past it', () => {
    const packet = view([0xc4, 0, 0, 0xf3, 0x10, 5, 0, 0x00, 0x01, 0, 20, 0x00]);
    expect(readItemList(packet, 6, 5, 1)).toHaveLength(1);
  });

  it('reads a single-item packet and a padded crafting result', () => {
    expect(readItemData(view([0x00, 0x05, 13, 80, 0x0f, 0x04, 0x3f])).lvl).toBe(13);
    // ShowItemCraftingResultPlugIn sends NeededSpace (15) bytes, the item first.
    const padded = [0xc0, 0x03, 11, 255, 0x0b, 0x23, 0x05, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(readItem(Uint8Array.from(padded))).toMatchObject({ length: 7, item: { group: 12, num: 3 } });
    expect(minItemLength()).toBe(5);
  });
});
