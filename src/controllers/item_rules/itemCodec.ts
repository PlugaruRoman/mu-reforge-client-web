import type { Item } from '../../ecs/world';
import { gameVersion } from '@/version';
import { ItemSerializer } from './itemSerializer';
import { ItemSerializerExtended } from './itemSerializerExtended';

/** The fewest bytes an item takes on the wire in the active version's codec. */
export function minItemLength(): number {
  return gameVersion.protocol.itemCodec === 'extended' ? 5 : ItemSerializer.NeededSpace;
}

/** The item at `at`, in the codec the server of the active version writes, and the bytes it took. */
export function readItem(bytes: Uint8Array, at = 0): { item: Item; length: number } {
  if (gameVersion.protocol.itemCodec === 'extended') return ItemSerializerExtended.DeserializeItem(bytes, at);
  return { item: ItemSerializer.DeserializeItem(bytes.subarray(at, at + ItemSerializer.NeededSpace)), length: ItemSerializer.NeededSpace };
}

/** The item a single-item packet carries in `data` (its `ItemData`, which runs to the packet's end). */
export function readItemData(data: DataView): Item {
  return readItem(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)).item;
}

/**
 * A list of `count` entries from `start`, each `head` bytes then one item: the offset of each
 * entry's head and its item. The standard codec strides `head + 12`; the extended one walks each
 * item's own length, as the server writes them back to back (S RemoteView/Inventory/UpdateInventoryListPlugIn.cs:59-82).
 */
export function readItemList(view: DataView, start: number, count: number, head: number): { at: number; item: Item }[] {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  const out: { at: number; item: Item }[] = [];
  let at = start;
  for (let i = 0; i < count && at + head < bytes.length; i++) {
    const { item, length } = readItem(bytes, at + head);
    out.push({ at, item });
    at += head + length;
  }
  return out;
}
