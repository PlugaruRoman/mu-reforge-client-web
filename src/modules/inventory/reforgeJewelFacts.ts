import type { Item } from '../../ecs/world';
import { isSocketItem, itemDef } from '@/controllers/item_rules';
import type { JewelTargetFacts } from './reforgeJewels';

/** Item slot 7 is the wings' (`IsWingItem`: the database's slot). */
const WING_SLOT = 7;

/** What our jewels need to know of a target from the item data (`ReforgeJewels.cpp`). */
export function jewelTargetFacts(target: Item): JewelTargetFacts {
  const def = itemDef(target.group, target.num);
  return { hasSkill: (def?.skill ?? 0) !== 0, wing: def?.slot === WING_SLOT, socketItem: isSocketItem(target.group, target.num) };
}
