import type { ItemRecord } from './item';

/** Every item, by group and index, in (group, index) order. Filled once from the item files. */
export class ItemRegistry {
  private readonly byKey = new Map<number, ItemRecord>();
  private list: ItemRecord[] = [];

  constructor(items: Iterable<ItemRecord> = []) {
    this.add(items);
  }

  /** Adds or replaces items; a later item with the same group and index wins (a version's own file). */
  add(items: Iterable<ItemRecord>): void {
    for (const item of items) this.byKey.set(item.Group * 512 + item.Index, item);
    this.list = [...this.byKey.values()].sort((a, b) => a.Group - b.Group || a.Index - b.Index);
  }

  get(group: number, index: number): ItemRecord | null {
    return this.byKey.get(group * 512 + index) ?? null;
  }

  all(): readonly ItemRecord[] {
    return this.list;
  }
}

/**
 * The registry the item files filled, handed over by the content that owns it
 * (`versions/shared/items/all.ts`). Controllers read an item's record through
 * `itemDef` instead of importing content: dependencies point down (AGENTS.md).
 */
let active: ItemRegistry | null = null;

export function setActiveItems(registry: ItemRegistry): void {
  active = registry;
}

/** The item file for (group, index), or null before the items are loaded or when there is none. */
export function itemDef(group: number, index: number): ItemRecord | null {
  return active?.get(group, index) ?? null;
}
