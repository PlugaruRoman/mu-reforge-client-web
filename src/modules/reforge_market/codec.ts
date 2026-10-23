import type { Item } from '@/ecs/world';
import { ItemSerializerExtended, readItem } from '@/controllers/item_rules';
import {
  MarketSearchRequestPacket,
  MarketTeleportRequestPacket,
} from '@versions/reforge/packets/ClientToServerPackets';

/**
 * The market's wire forms. E8 01 is written by hand on our server (S RemoteView/Market/
 * MarketViewPlugIn.cs ShowSearchResultAsync): a 10-byte header, then 83-byte listings with a 12-byte
 * item (86 with the 15-byte one a later server may send; our client reads both, MarketPackets.cpp
 * ParseMarketSearchResult). E8 06 is hand-written too (ShowStoreCurrenciesAsync).
 */

export type Listing = {
  sellerName: string;
  mapNumber: number;
  x: number;
  y: number;
  storeSlot: number;
  currency: number;
  price: number;
  /** Undefined when the server had to leave the item out (it did not fit the listing). */
  item?: Item;
  itemName: string;
  storeName: string;
};

export type SearchPage = { page: number; pageCount: number; totalCount: number; listings: Listing[] };

export type SearchFilter = {
  text: string;
  currency: number;
  category: number;
  quality: number;
  sortOrder: number;
  page: number;
};

const HEADER = 10;
const SHORT_LISTING = 83;
const LONG_LISTING = 86;
const SHORT_ITEM = 12;
const SEARCH_TEXT_LENGTH = 16;
const SELLER_NAME_LENGTH = 10;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** A zero padded UTF-8 field (S WriteString cuts bytes, so a split last character is dropped). */
function fixedString(bytes: Uint8Array, at: number, length: number): string {
  const field = bytes.subarray(at, at + length);
  const end = field.indexOf(0);
  return decoder.decode(end < 0 ? field : field.subarray(0, end)).replace(/\uFFFD$/, '');
}

/** `text` in UTF-8, cut to `length` bytes without splitting a character (MarketPackets.cpp Utf8Within). */
export function utf8Within(text: string, length: number): Uint8Array {
  const bytes = encoder.encode(text);
  if (bytes.length <= length) return bytes;
  let cut = length;
  while (cut > 0 && (bytes[cut] & 0xc0) === 0x80) cut--;
  return bytes.subarray(0, cut);
}

/** The listing's item, when its bytes are all inside the room (ReforgeMarket.cpp IsCompleteItemData). */
function listingItem(bytes: Uint8Array, at: number, room: number): Item | undefined {
  const flags = bytes[at + 4];
  if (flags & 0x80 && 5 + popcount(flags & 0x39) >= room) return undefined;
  if (ItemSerializerExtended.ItemLength(bytes, at) > room) return undefined;
  if (bytes.subarray(at, at + room).every(b => b === 0)) return undefined;
  return readItem(bytes, at).item;
}

function popcount(v: number): number {
  let n = 0;
  for (; v; v &= v - 1) n++;
  return n;
}

/** E8 01 MarketSearchResponse. */
export function parseSearchPage(view: DataView): SearchPage | null {
  if (view.byteLength < HEADER) return null;
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  const declared = Math.min((bytes[1] << 8) | bytes[2], bytes.length);
  const listingCount = bytes[9];
  const body = declared - HEADER;
  // The listing length is not in the packet: the long one when every listing fits in it.
  const long = listingCount > 0 && body >= listingCount * LONG_LISTING;
  const size = long ? LONG_LISTING : SHORT_LISTING;
  const room = SHORT_ITEM + (long ? 3 : 0);
  const shift = room - SHORT_ITEM;
  const count = Math.min(listingCount, Math.floor(body / size));
  const listings: Listing[] = [];
  for (let i = 0; i < count; i++) {
    const at = HEADER + i * size;
    listings.push({
      sellerName: fixedString(bytes, at, SELLER_NAME_LENGTH),
      mapNumber: bytes[at + 10],
      x: bytes[at + 11],
      y: bytes[at + 12],
      storeSlot: bytes[at + 13],
      currency: bytes[at + 14],
      price: view.getUint32(at + 15, true),
      item: listingItem(bytes, at + 19, room),
      itemName: fixedString(bytes, at + 31 + shift, 32),
      storeName: fixedString(bytes, at + 63 + shift, 20),
    });
  }
  return { page: bytes[5], pageCount: bytes[6], totalCount: view.getUint16(7, true), listings };
}

export type PriceLimits = { wcoin: number; jewel: number; zenBox: number };

/** E8 05 MarketOpenResponse: 0 opens the window, 1 only refreshes the price ceilings. */
export function parseOpen(view: DataView): { openWindow: boolean; limits: PriceLimits } | null {
  if (view.byteLength < 13) return null;
  return {
    openWindow: view.getUint8(4) === 0,
    limits: {
      wcoin: view.getUint32(5, true),
      jewel: view.getUint32(9, true),
      // An older server sends no box ceiling (MarketPackets.cpp ParseMarketOpen).
      zenBox: view.byteLength >= 17 ? view.getUint32(13, true) : 0,
    },
  };
}

/** E8 03 MarketPriceResponse. */
export function parsePriceAnswer(view: DataView): { result: number; slot: number; currency: number; price: number } | null {
  if (view.byteLength < 11) return null;
  return { result: view.getUint8(4), slot: view.getUint8(5), currency: view.getUint8(6), price: view.getUint32(7, true) };
}

/** E8 06, hand-written: C1 [len] E8 06 [count] then (slot, currency) pairs. */
export function parseStoreCurrencies(view: DataView): { slot: number; currency: number }[] {
  if (view.byteLength < 5) return [];
  const count = Math.min(view.getUint8(4), Math.floor((view.byteLength - 5) / 2));
  return Array.from({ length: count }, (_, i) => ({ slot: view.getUint8(5 + i * 2), currency: view.getUint8(6 + i * 2) }));
}

/** E8 01 MarketSearchRequest, 25 bytes (S MessageHandler/Market/MarketSearchRequestHandlerPlugIn.cs). */
export function buildSearch(filter: SearchFilter): DataView {
  const p = MarketSearchRequestPacket.createPacket();
  p.Page = Math.max(0, Math.min(filter.page, 0xff));
  p.Currency = filter.currency;
  p.Category = filter.category;
  p.Quality = filter.quality;
  p.SortOrder = filter.sortOrder;
  // The generated setter writes UTF-16 code units; the server reads UTF-8 (our client's FixedString).
  new Uint8Array(p.buffer.buffer).set(utf8Within(filter.text, SEARCH_TEXT_LENGTH), 9);
  return p.buffer;
}

/** E8 04 MarketTeleportRequest, 14 bytes. */
export function buildTeleport(sellerName: string): DataView {
  const p = MarketTeleportRequestPacket.createPacket();
  new Uint8Array(p.buffer.buffer).set(utf8Within(sellerName, SELLER_NAME_LENGTH), 4);
  return p.buffer;
}
