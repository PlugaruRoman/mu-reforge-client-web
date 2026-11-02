import { Ecs } from '@/ecs/current';
import type { Entity, World } from '@/ecs/world';
import { Social } from '@/modules/social/social';
import { HeroSkills } from '@/modules/skills';
import { TELEPORT, TELEPORT_ALLY } from '@/modules/skills/skillCasting';
import { aimAlongFacing, teleportSquareOpen } from '@/modules/warp/teleportRules';
import { skillDefinition } from '@versions/shared/skills/skillsDatabase';
import { isAttackableEntity } from '@/ecs/systems/attackSystem';

/**
 * What the touch buttons do (our Android client's UI/Touch/TouchActions.cpp). Each writes the seam the
 * mouse writes - `attackTarget` for a swing, `castRequest` for a skill - and stops there: the
 * attack and cast systems own range, the walk into it, the delays and the packets.
 */

/** How far the attack button looks for a monster, in tiles (`TargetSearchTiles`). */
const TARGET_SEARCH_TILES = 8;

function nearestMonster(world: World, hero: Entity): Entity | null {
  const at = hero.transform?.pos;
  if (!at) return null;
  let best: Entity | null = null;
  let bestDistance = TARGET_SEARCH_TILES * TARGET_SEARCH_TILES + 1;
  for (const e of world.netObjsQuery.entities) {
    if (!isAttackableEntity(world, e)) continue;
    const d = (~~e.transform.pos.x - ~~at.x) ** 2 + (~~e.transform.pos.z - ~~at.z) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = e;
    }
  }
  return best;
}

/** The monster to aim at: the one held while it lives (a tap on it, or the last swing), else the nearest. */
function acquireTarget(world: World, hero: Entity): Entity | null {
  const held = world.attackTarget;
  if (held && isAttackableEntity(world, held)) return held;
  return nearestMonster(world, hero);
}

/**
 * The large button with no skill on it: attack the held monster, or the nearest one. The swing goes
 * on until it dies (`attackSystem`); held, the button moves on to the next (`attackHeld`).
 */
export function attack(): void {
  const world = Ecs.world;
  const hero = world?.playerEntity;
  if (!world || !hero || hero.dying) return;
  world.castRequest = null;
  const target = acquireTarget(world, hero);
  if (target) world.attackTarget = target;
}

/** Called each frame while the large button is held: a dead target is followed by the next one. */
export function attackHeld(): void {
  const world = Ecs.world;
  if (world && !world.attackTarget) attack();
}

/**
 * Fire `number` at the target. With nothing targeted an attack skill takes the nearest monster
 * (Nova and the area skills fall back to the hero's own tile); a buff lands on the hero.
 */
export function castSkill(number: number): void {
  const world = Ecs.world;
  const hero = world?.playerEntity;
  if (!world || !hero || hero.dying) return;

  HeroSkills.selectSkill(number);

  // Teleport has no cursor to aim at here: it takes the furthest open square straight ahead.
  if (number === TELEPORT) {
    const yaw = hero.transform.rot.y;
    const pos = hero.transform.pos;
    const to = aimAlongFacing(
      { x: Math.floor(pos.x), y: Math.floor(pos.z) },
      { x: Math.sin(yaw), z: -Math.cos(yaw) },
      skillDefinition(TELEPORT)?.distance ?? 6,
      (x, y) => teleportSquareOpen(world.getTerrainFlag(x, y))
    );
    if (to) world.castRequest = { target: null, point: { x: to.x, y: to.y }, forced: false };
    return;
  }

  // Teleport Ally has no player to pick here: it pulls the nearest party member in sight.
  if (number === TELEPORT_ALLY) {
    const heroPos = hero.transform.pos;
    let mate: Entity | null = null;
    let best = Infinity;
    for (const e of world.netObjsQuery.entities) {
      const name = e.objectNameInWorld?.trimEnd();
      if (e.localPlayer || !e.playerAnimation || !name) continue;
      if (!Social.partyMembers.some(m => m.name.trimEnd() === name)) continue;
      const d = (e.transform.pos.x - heroPos.x) ** 2 + (e.transform.pos.z - heroPos.z) ** 2;
      if (d < best) {
        best = d;
        mate = e;
      }
    }
    if (mate) world.castRequest = { target: mate, point: null, forced: false };
    return;
  }

  const damages = (skillDefinition(number)?.damage ?? 0) > 0;
  const target = damages ? acquireTarget(world, hero) : null;
  const pos = target?.transform?.pos ?? hero.transform.pos;
  world.castRequest = { target, point: { x: pos.x, y: pos.z }, forced: false };
}
