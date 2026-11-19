import { combat } from '@/controllers/combat';
import { defineSkill } from '@/controllers/skills/define';
import { afterRelease, currentSkill, fanArrows, launcherShot, steelHit, weaponsOf } from '@/controllers/skills/visuals';

/** Triple Shot Mastery: only learnable at 10/10, so casting it means its extra arrow is on. */
const TRIPLE_SHOT_MASTERY = 418;
/** The (cross)bows the server gives one more Triple Shot arrow (group 4, Weapons.cs: the five S6 ones and both Hero stages). */
const FOUR_ARROW_LAUNCHERS = new Set([18, 19, 22, 23, 24, 25, 26, 27, 28]);
/** The fan always spans ±15°, however many arrows it holds. */
const FAN = (30 * Math.PI) / 180;

/** The arrows the server shoots: 3, +1 on a four-arrow launcher, +1 with the Mastery. */
export function tripleShotArrows(skill: number, launcherNum: number | undefined): number {
  return 3 + (launcherNum !== undefined && FOUR_ARROW_LAUNCHERS.has(launcherNum) ? 1 : 0) + (skill === TRIPLE_SHOT_MASTERY ? 1 : 0);
}

export default defineSkill({
  id: 24,
  name: "Triple Shot",
  checksArrows: true, // CheckArrow() before the shot (SkillCast.cpp:1189)
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [414, 418],
  // 24 Triple Shot: CreateArrows(Skill=1) → the fan at the release (ZzzCharacter.cpp:4811-4828, :4893-4897),
  // each the bow's own arrow (CreateArrow, ZzzEffectMagicSkill.cpp:174-251). [reforge] As many arrows as the
  // server shoots (tripleShotArrows), spread evenly over the same ±15°.
  visual: {
    area: afterRelease((at, c) => {
      const s = launcherShot(c.caster);
      const n = tripleShotArrows(currentSkill, combat.equippedLauncher(weaponsOf(c.caster))?.num);
      fanArrows(at, c, n, s.model, s.colour, FAN / (n - 1));
    }),
    impact: steelHit,
  },
});
