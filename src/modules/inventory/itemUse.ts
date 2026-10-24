import type { Item } from '../../ecs/world';

/**
 * What a right click in the bag uses with a plain 0x26 ConsumeItemRequest (item slot, no target):
 * our C++ client's `CInventoryActionController::TryConsumeItem` (UI/Inventory/
 * InventoryActionController.cpp:703), kept to the items our server has a consume handler for
 * (S GameLogic/PlayerActions/ItemConsumeActions, `ItemConsumeAction`: a handler by item, else the
 * item's `ConsumeEffect`). What the client offers and the server refuses (the elixirs 14/78-82,
 * the Remedy of Love, the talismans, the reset fruits) is left out: the click would only draw
 * "not implemented". Tickets, orbs and scrolls have paths of their own before this one.
 */

/** Group 14: the potions, the scrolls and the boxes. */
const POTIONS: ReadonlySet<number> = new Set([
  ...range(0, 10), // apple, healing and mana potions, siege potion, antidote, ale, Town Portal
  ...range(35, 40), // shield and complex potions
  ...range(46, 50), // Jack O'Lantern (ConsumeEffect)
  70, 71, // elite healing / mana potion
  ...range(72, 77), // Scrolls of Quickness, Defense, Wrath, Wizardry, Health, Mana
  ...range(85, 87), // Cherry Blossom wine, rice cake, petal (ConsumeEffect)
  97, 98, // Scroll of Battle, Scroll of Strengthener
  133, // elite SD potion
  162, // Mu Reforge: Magic Backpack (MagicBackpackConsumeHandlerPlugIn)
  163, // Mu Reforge: Vault Expansion Certificate (VaultExpansionConsumeHandlerPlugIn)
]);

/** Group 13. */
const HELPERS: ReadonlySet<number> = new Set([
  11, // Life Stone (LifeStoneConsumeHandlerPlugIn: planted during a castle siege)
  48, // Kalima ticket (KalimaTicketConsumeHandlerPlugIn: the server says where it works)
]);

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** Whether a right click on `item` sends the consume request. */
export function isRightClickConsumable(item: Item): boolean {
  if (item.group === 14) return POTIONS.has(item.num);
  if (item.group === 13) return HELPERS.has(item.num);
  return false;
}
