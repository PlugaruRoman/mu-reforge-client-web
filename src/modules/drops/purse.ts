/**
 * Zen the purse has no room for. Our server pays out whatever part of a pile still fits
 * (`MoneyDistribution`) and refuses the pile only when the purse is already at
 * `GameConfiguration.MaximumInventoryMoney` (`PickupItemAction`; int.MaxValue unless the panel
 * lowers it). A refused pile lies there until it despawns, and since every kill drops a new one next
 * to the hero, the closest drop always won: the MU Helper and Space walked from one refused pile to
 * the next and never reached the items. Our C++ client skips them (`ReforgePickup::IsZenOverPurse`).
 */

/** `GameConfigurationInitializerBase`: `MaximumInventoryMoney = int.MaxValue`. */
const MAX_INVENTORY_ZEN = 2_147_483_647;

/** Whether `drop` is zen the server would refuse with `money` in the purse. */
export function isZenOverPurse(drop: { isMoney?: boolean } | undefined, money: number): boolean {
  return !!drop?.isMoney && money >= MAX_INVENTORY_ZEN;
}
