import type { ItemRecord } from '@/controllers/items';
import { items } from '../../shared/items/all';

/**
 * Our item files (`<group>/<item>.ts`, written by tools/reforgeItems.ts), laid over Season 6's in the one
 * registry when the Mu Reforge version loads: a file here adds an item or replaces the stock one.
 */
export const reforgeItems: ItemRecord[] = Object.values(
  import.meta.glob<ItemRecord>('./*/*.ts', { eager: true, import: 'default' })
);

items.add(reforgeItems);
