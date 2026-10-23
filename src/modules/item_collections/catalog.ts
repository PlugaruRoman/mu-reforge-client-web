/**
 * Mu Reforge's Item Collections catalog and requests, byte for byte as our server writes and reads them
 * (S GameServer/RemoteView/ItemCollections/ItemCollectionViewPlugIn.cs, S GameServer/MessageHandler/
 * ItemCollections/*.cs; our client: Network/Reforge/ItemCollectionPackets.cpp, GameLogic/Reforge/
 * ReforgeItemCollections.cpp).
 */

/** `ItemCollectionCategory`; 0 is the "All" tab. */
export const CATEGORY_COUNT = 5;
/** The window draws at most this many slots and bonuses of a collection (ReforgeItemCollections.h:15-16). */
export const MAX_SLOTS = 7;
export const MAX_BONUSES = 3;

/** The slot flags byte (ItemCollectionViewPlugIn.cs:89-94). */
export const SlotFlag = {
  Excellent: 0x01,
  Filled: 0x02,
  /** An item of the inventory fits it. */
  Available: 0x04,
  Ancient: 0x08,
  Luck: 0x10,
  /** The excellent mask names the attack pool, not the defense one. */
  AttackOptions: 0x20,
} as const;

export type CollectionSlot = {
  group: number;
  number: number;
  minimumLevel: number;
  flags: number;
  excellentMask: number;
  minimumOptionLevel: number;
};

/** `type` is `ItemCollectionBonusType` (1-15), `hundredths` the value times 100. */
export type CollectionBonus = { type: number; hundredths: number };

export type Collection = {
  number: number;
  category: number;
  name: string;
  slots: CollectionSlot[];
  bonuses: CollectionBonus[];
};

/** `ItemCollectionRegisterResult` (S GameLogic/ItemCollections/ItemCollectionRegisterResult.cs). */
export const RegisterResult = {
  Registered: 0,
  Completed: 1,
  UnknownCollection: 2,
  AlreadyFilled: 3,
  ItemMismatch: 4,
  LevelTooLow: 5,
  ExcellentRequired: 6,
  ItemNotAllowed: 7,
  NotAllowedNow: 8,
  AncientRequired: 9,
  OptionsMissing: 10,
} as const;

export const has = (slot: CollectionSlot, flag: number) => (slot.flags & flag) !== 0;
export const canRegister = (slot: CollectionSlot) => !has(slot, SlotFlag.Filled) && has(slot, SlotFlag.Available);
export const filledCount = (c: Collection) => c.slots.filter(s => has(s, SlotFlag.Filled)).length;
export const isComplete = (c: Collection) => c.slots.length > 0 && filledCount(c) === c.slots.length;

/**
 * C2 FA 01: `[C2][len u16 BE][FA][01][count]`, then per collection `[number u16 LE][category][slots]
 * [bonuses][nameLength][name]`, 7-byte slots and 5-byte bonuses (ItemCollectionViewPlugIn.cs:62-108).
 * Stops at a collection that runs past the declared length, as our client does.
 */
export function parseCatalog(view: DataView): Collection[] {
  if (view.byteLength < 6) return [];
  const end = Math.min(view.byteLength, Math.max(6, (view.getUint8(1) << 8) | view.getUint8(2)));
  const count = view.getUint8(5);
  const out: Collection[] = [];
  let at = 6;
  for (let i = 0; i < count; i++) {
    if (at + 6 > end) break;
    const slotCount = view.getUint8(at + 3);
    const bonusCount = view.getUint8(at + 4);
    const nameLength = view.getUint8(at + 5);
    if (at + 6 + nameLength + slotCount * 7 + bonusCount * 5 > end) break;
    const collection: Collection = { number: view.getUint16(at, true), category: view.getUint8(at + 2), name: '', slots: [], bonuses: [] };
    at += 6;
    for (let c = 0; c < nameLength; c++) collection.name += String.fromCharCode(view.getUint8(at + c));
    at += nameLength;
    for (let s = 0; s < slotCount; s++, at += 7) {
      if (s >= MAX_SLOTS) continue;
      collection.slots.push({
        group: view.getUint8(at),
        number: view.getUint16(at + 1, true),
        minimumLevel: view.getUint8(at + 3),
        flags: view.getUint8(at + 4),
        excellentMask: view.getUint8(at + 5),
        minimumOptionLevel: view.getUint8(at + 6),
      });
    }
    for (let b = 0; b < bonusCount; b++, at += 5) {
      if (b < MAX_BONUSES) collection.bonuses.push({ type: view.getUint8(at), hundredths: view.getInt32(at + 1, true) });
    }
    out.push(collection);
  }
  return out;
}

/** C1 FA 02: `[result][collection u16 LE][slot]` at 4 (ItemCollectionViewPlugIn.cs:128-136). */
export function parseRegisterResult(view: DataView): { result: number; collection: number; slot: number } | null {
  if (view.byteLength < 8) return null;
  return { result: view.getUint8(4), collection: view.getUint16(5, true), slot: view.getUint8(7) };
}

/** C1 04 FA 01: the catalog request (ItemCollectionListRequestHandlerPlugIn.cs, no fields). */
export function listRequest(): DataView {
  return new DataView(Uint8Array.from([0xc1, 0x04, 0xfa, 0x01]).buffer);
}

/** The server picks the weakest fitting inventory item (ItemCollectionAction.AnyInventorySlot). */
export const SERVER_PICKS_INVENTORY_SLOT = 0xff;

/**
 * C1 08 FA 02: `[collection u16 LE][slot][inventory slot]` at 4, read by
 * ItemCollectionRegisterHandlerPlugIn.cs:44-47 (0xFFFF = any collection, 0xFF = any slot / item).
 */
export function registerRequest(collection: number, slot: number, inventorySlot = SERVER_PICKS_INVENTORY_SLOT): DataView {
  return new DataView(Uint8Array.from([0xc1, 0x08, 0xfa, 0x02, collection & 0xff, (collection >> 8) & 0xff, slot & 0xff, inventorySlot & 0xff]).buffer);
}

/** How a bonus reads: flat for max HP / SD, a decrease for damage taken, a percent otherwise (ReforgeItemCollections.cpp:41-53). */
export function bonusFormat(type: number): 'flat' | 'percent' | 'decrease' {
  if (type === 1 || type === 3) return 'flat';
  return type === 10 ? 'decrease' : 'percent';
}

/** 150 -> "1.5", 105 -> "1.05", 200 -> "2" (ReforgeItemCollections.cpp:55-73). */
export function formatHundredths(hundredths: number): string {
  const value = Math.abs(hundredths);
  const whole = Math.trunc(value / 100);
  const fraction = value % 100;
  if (fraction === 0) return String(whole);
  if (fraction % 10 === 0) return `${whole}.${fraction / 10}`;
  return `${whole}.${fraction < 10 ? '0' : ''}${fraction}`;
}

/** The indexes the tab shows: every collection for 0 (All), else those of its category. */
export function visibleIndexes(collections: readonly Collection[], category: number): number[] {
  return collections.flatMap((c, i) => (category === 0 || c.category === category ? [i] : []));
}

export function summarize(collections: readonly Collection[]) {
  return {
    completed: collections.filter(isComplete).length,
    collections: collections.length,
    filledSlots: collections.reduce((n, c) => n + filledCount(c), 0),
    slots: collections.reduce((n, c) => n + c.slots.length, 0),
  };
}
