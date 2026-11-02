/**
 * Which skill each touch skill button casts (our Android client's `Actions::GetSkillButton`,
 * UI/Touch/TouchActions.cpp): button `i` is the bar's hot key `i + 1`; an empty key takes the next
 * learned skill that sits on no key, so a player who never set a key still has four skills.
 */
export const TOUCH_SKILL_BUTTONS = 4;

/** `hotkeys` by digit (index 1 is key 1, index 0 key 0); `learned` the bar-able skills in list order. */
export function touchSkillButtons(hotkeys: readonly number[], learned: readonly number[]): number[] {
  const on = new Set(hotkeys.filter(n => n >= 0));
  const spare = learned.filter(n => !on.has(n));
  return Array.from({ length: TOUCH_SKILL_BUTTONS }, (_, i) => {
    const number = hotkeys[i + 1] ?? -1;
    return number >= 0 && learned.includes(number) ? number : (spare.shift() ?? -1);
  });
}
