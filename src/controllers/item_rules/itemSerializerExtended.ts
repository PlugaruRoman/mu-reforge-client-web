import type { Item } from '../../ecs/world';
import { ItemSerializer } from './itemSerializer';
import { isOptionWing } from './wingOptions';

/** `OptionFlags` (S RemoteView/ItemSerializerExtended.cs:31-42). */
const HasOption = 0x01;
const HasLuck = 0x02;
const HasSkill = 0x04;
const HasExcellent = 0x08;
const HasAncient = 0x10;
const HasHarmony = 0x20;
const HasGuardian = 0x40;
const HasSockets = 0x80;
const NoSocket = 0xff;

/**
 * OpenMU `ItemSerializerExtended` (client >= 106.3, S RemoteView/ItemSerializerExtended.cs:210-237):
 * 0: group (high nibble) + number bits 8-11 · 1: number low byte · 2: level · 3: durability ·
 * 4: option flags · then, each only when its flag is set: option (type << 4 | level),
 * excellent (with the Fenrir bits), ancient (bonus << 4 | discriminator), harmony,
 * socket (bonus << 4 | count) and `count` socket bytes. 5 to 15 bytes.
 *
 * It reads by rewriting the item into the 12-byte `ItemSerializer` layout and parsing that, so
 * the item and its `raw` bytes are exactly what a 10404 server sends for it.
 */
export class ItemSerializerExtended {
  /** Bytes the item at `at` occupies (`ItemStruct.Length`, :363-396; CalcItemLength, WSclient.cpp:1637). */
  static ItemLength(bytes: Uint8Array, at = 0): number {
    const flags = bytes[at + 4];
    let size = 5;
    if (flags & HasOption) size++;
    if (flags & HasExcellent) size++;
    if (flags & HasAncient) size++;
    if (flags & HasHarmony) size++;
    if (flags & HasSockets) size += 1 + (bytes[at + size] & 0x0f);
    return size;
  }

  /** The item at `at` and the bytes it took. */
  static DeserializeItem(bytes: Uint8Array, at = 0): { item: Item; length: number } {
    const standard = ItemSerializerExtended.ToStandard(bytes, at);
    return { item: ItemSerializer.DeserializeItem(standard), length: ItemSerializerExtended.ItemLength(bytes, at) };
  }

  /** The 12 bytes OpenMU `ItemSerializer.SerializeItem` writes for the same item (S RemoteView/ItemSerializer.cs:46-122). */
  static ToStandard(bytes: Uint8Array, at = 0): Uint8Array {
    const group = bytes[at] >> 4;
    const num = ((bytes[at] & 0x0f) << 8) | bytes[at + 1];
    const level = bytes[at + 2];
    const flags = bytes[at + 4];
    let i = at + 5;
    const option = flags & HasOption ? bytes[i++] : 0;
    const excellent = flags & HasExcellent ? bytes[i++] : 0;
    const ancient = flags & HasAncient ? bytes[i++] : 0;
    const harmony = flags & HasHarmony ? bytes[i++] : 0;
    const socket = flags & HasSockets ? bytes[i++] : 0;

    const out = new Uint8Array(ItemSerializer.NeededSpace);
    const optionLevel = option & 0x0f;
    const optionType = option >> 4;
    out[0] = num & 0xff;
    // Level bits 3-6, skill 0x80, luck 0x04, option level bits 0-1 (:52, :68, :93, :98).
    out[1] = ((level << 3) & 0x78) | (flags & HasSkill ? 0x80 : 0) | (flags & HasLuck ? 0x04 : 0) | (optionLevel & 0x03);
    out[2] = bytes[at + 3];
    // Excellent / wing / Fenrir bits, option level bit 2 at 0x40, number bit 8 at 0x80 (:69, :81-89);
    // a wing's option type rides bits 4-5 (:75), which only a wing's 4 option bits leave free.
    out[3] = (excellent & 0x3f) | ((optionLevel & 0x04) << 4) | (num & 0x100 ? 0x80 : 0);
    if (optionType && isOptionWing(group, num)) out[3] |= (optionType & 0x03) << 4;
    // Discriminator bits 0-1, bonus level bits 2-3 (:104, :110).
    out[4] = (ancient & 0x03) | (((ancient >> 4) << 2) & 0x0c);
    // Group high nibble, 380 option 0x08 (:114-117).
    out[5] = (group << 4) | (flags & HasGuardian ? 0x08 : 0);
    // Harmony, or a socket item's bonus; the extended nibble 0xF is "none", 0xFF here (ItemSerializer.cs:120, ItemSerializerHelper.cs:105-119, :234).
    const socketBonus = socket >> 4;
    out[6] = flags & HasSockets ? (socketBonus === 0x0f ? NoSocket : socketBonus) : harmony;
    const count = socket & 0x0f;
    for (let s = 0; s < 5; s++) out[7 + s] = s < count ? bytes[i + s] : NoSocket;
    return out;
  }
}
