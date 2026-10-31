import type { Item } from '../../ecs/world';

/**
 * Mu Reforge's own jewels, dropped on an item like Bless (our C++ client's
 * GameLogic/Reforge/ReforgeJewels.cpp `CanApply`). The client only spares the player a request the
 * server would refuse; the server's consume handlers decide (S GameLogic/PlayerActions/
 * ItemConsumeActions/{Skill,Luck,Sea}JewelConsumeHandlerPlugIn.cs, SocketGemConsumeHandlerPlugIn.cs).
 * Other servers have no such items, so these numbers never come up there.
 */
export const REFORGE_JEWEL = { skill: 124, luck: 125, sea: 176, socketGem: 177 } as const;

const REFORGE_JEWELS: ReadonlySet<number> = new Set(Object.values(REFORGE_JEWEL));

/** Group 14 only, like every jewel dropped on gear. */
export const isReforgeJewel = (item: Item) => item.group === 14 && REFORGE_JEWELS.has(item.num);

/** The rings and pendants the Jewel of Sea raises (`IsUpgradeableJewelery`), up to +9. */
export const UPGRADEABLE_JEWELRY: ReadonlySet<number> = new Set([8, 9, 12, 13, 21, 22, 23, 24, 25, 26, 27, 28]);
const MAX_JEWELRY_LEVEL = 9;
/** `MAX_SOCKETS`. */
const MAX_SOCKETS = 5;
/**
 * What the item data says of the target (`reforgeJewelFacts.ts` reads it): kept apart so this file and
 * `jewelUpgrade.ts` stay free of client code (the cash shop server imports them).
 */
export type JewelTargetFacts = {
  hasSkill: boolean;
  wing: boolean;
  socketItem: boolean;
  /** The server lets the Jewel of Harmony onto an ancient item (`features.harmonyOnAncient`). */
  harmonyOnAncient?: boolean;
};

/** `CanHaveLuck`: weapons, shields and armour (not ammunition) and wings. */
function canHaveLuck(target: Item, facts: JewelTargetFacts): boolean {
  if (target.group <= 11) return !(target.group === 4 && (target.num === 7 || target.num === 15));
  return facts.wing;
}

/** Whether `jewel` (one of ours) acts on `target`. */
export function reforgeJewelApplies(jewel: Item, target: Item, facts: JewelTargetFacts): boolean {
  switch (jewel.num) {
    case REFORGE_JEWEL.skill:
      return facts.hasSkill && !target.hasSkill;
    case REFORGE_JEWEL.luck:
      return canHaveLuck(target, facts) && !target.luck;
    case REFORGE_JEWEL.sea:
      return target.group === 13 && UPGRADEABLE_JEWELRY.has(target.num) && (target.lvl ?? 0) < MAX_JEWELRY_LEVEL;
    case REFORGE_JEWEL.socketGem:
      return facts.socketItem && (target.socketCount ?? 0) < MAX_SOCKETS;
    default:
      return false;
  }
}
