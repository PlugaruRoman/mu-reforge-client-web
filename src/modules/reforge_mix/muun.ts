import type { Item } from '@/ecs/world';
import type { TooltipLine } from '@/controllers/interface';
import { t, type TextKey } from '@/i18n';
import { JEWEL_OF_NIGHTMARE } from './recipes';

/**
 * Mu Reforge's muun pets (S VersionSeasonSix/MuunPets.cs): 13/150-155, made from a Gold Fenrir with a Jewel of
 * Nightmare at the chaos machine (mix 118). Each gives the Gold Fenrir's combat bonuses, without the mount, and one of
 * its own. Our client's ReforgeItemTooltip.cpp `AddMuunPetLines` / `AddJewelLines`, ReforgeItemTypes.h `IsMuunPet`.
 */

const PET_GROUP = 13;
const FIRST_MUUN_PET = 150;
const LAST_MUUN_PET = 155;

export function isMuunPet(item: Pick<Item, 'group' | 'num'>): boolean {
  return item.group === PET_GROUP && item.num >= FIRST_MUUN_PET && item.num <= LAST_MUUN_PET;
}

/**
 * The Divine Horses (S MuunPets.cs, mix 119; our ReforgeItemTypes.h `IsDivineHorse`): 13/156-161, a Gold Fenrir's
 * combat bonuses and the own bonus of the muun pet in the same place (156 like 150 ... 161 like 155), ridden by the
 * Dark Lord like the Dark Horse.
 */
const FIRST_DIVINE_HORSE = 156;
const LAST_DIVINE_HORSE = 161;

export function isDivineHorse(item: Pick<Item, 'group' | 'num'>): boolean {
  return item.group === PET_GROUP && item.num >= FIRST_DIVINE_HORSE && item.num <= LAST_DIVINE_HORSE;
}

/** The Gold Fenrir's combat bonuses (S MuunPets.Specs, our `AddFenrirLines`): final damage, absorb, then by total level. */
const FINAL_DAMAGE_PERCENT = 40;
const ABSORB_PERCENT = 25;
const LIFE_MANA_DIVISOR = 2;
const ATTACK_DIVISOR = 12;
const WIZARDRY_DIVISOR = 25;

/** Each pet's own bonus, in percent (`MuunPetBonuses`). */
const OWN_BONUS: Readonly<Record<number, { key: TextKey; value: number }>> = {
  150: { key: 'reforgeMix.muunDoubleDamage', value: 5 },
  151: { key: 'reforgeMix.muunIgnoreDefense', value: 5 },
  152: { key: 'reforgeMix.muunDefenseRate', value: 10 },
  153: { key: 'reforgeMix.muunExcellentDamage', value: 5 },
  154: { key: 'reforgeMix.muunCriticalDamage', value: 5 },
  155: { key: 'reforgeMix.muunReflect', value: 5 },
};

const line = (text: string, color: TooltipLine['color']): TooltipLine => ({ text, color, bold: false });

/**
 * The Gold Fenrir's bonuses in blue (life, mana, attack and wizardry by the hero's total level, normal plus master)
 * and the own bonus of muun pet `bonusOf` in yellow (`AddGoldFenrirPetLines`).
 */
function goldFenrirPetLines(bonusOf: number, totalLevel: number): TooltipLine[] {
  const level = Math.max(0, Math.trunc(totalLevel));
  const own = OWN_BONUS[bonusOf];
  return [
    line(t('item.fenrir.finalDamage', { value: FINAL_DAMAGE_PERCENT }), 'blue'),
    line(t('item.fenrir.absorbFinal', { value: ABSORB_PERCENT }), 'blue'),
    line(t('item.fenrir.life', { value: Math.trunc(level / LIFE_MANA_DIVISOR) }), 'blue'),
    line(t('item.fenrir.mana', { value: Math.trunc(level / LIFE_MANA_DIVISOR) }), 'blue'),
    line(t('item.fenrir.attack', { value: Math.trunc(level / ATTACK_DIVISOR) }), 'blue'),
    line(t('item.fenrir.wizardry', { value: Math.trunc(level / WIZARDRY_DIVISOR) }), 'blue'),
    ...(own ? [line(t(own.key, { value: own.value }), 'yellow')] : []),
  ];
}

/** A muun pet's lines (`AddMuunPetLines`): the Gold Fenrir's and its own bonus, where its power comes from in green. */
export function muunPetLines(item: Pick<Item, 'group' | 'num'>, totalLevel: number): TooltipLine[] {
  if (!isMuunPet(item)) return [];
  return [...goldFenrirPetLines(item.num, totalLevel), line(t('reforgeMix.muunOrigin'), 'green')];
}

/**
 * A Divine Horse's lines (`AddDivineHorseLines`): the Gold Fenrir's bonuses and the own bonus of the muun pet in its
 * place, then in green that the Dark Lord rides it like the Dark Horse, its Earthshake and what it is made of.
 */
export function divineHorseLines(item: Pick<Item, 'group' | 'num'>, totalLevel: number): TooltipLine[] {
  if (!isDivineHorse(item)) return [];
  return [
    ...goldFenrirPetLines(FIRST_MUUN_PET + (item.num - FIRST_DIVINE_HORSE), totalLevel),
    line(t('reforgeMix.divineHorseRide'), 'green'),
    line(t('reforgeMix.divineHorseSkill'), 'green'),
    line(t('reforgeMix.divineHorseOrigin'), 'green'),
  ];
}

/**
 * The Jewel of Nightmare's lines (`AddJewelLines`): what it does in white, the recipe in green, and the Divine Horse's
 * (mix 119) in green. The desktop line is
 * one sentence of 131 characters; the tooltip does not wrap (`white-space: nowrap`), so it is two lines here.
 */
export function jewelOfNightmareLines(item: Pick<Item, 'group' | 'num'>): TooltipLine[] {
  if (item.group !== 14 || item.num !== JEWEL_OF_NIGHTMARE) return [];
  return [
    line(t('reforgeMix.nightmare'), 'white'),
    line(t('reforgeMix.nightmareUse'), 'green'),
    line(t('reforgeMix.nightmareUse2'), 'green'),
    line(t('reforgeMix.nightmareDivineHorse'), 'green'),
  ];
}
