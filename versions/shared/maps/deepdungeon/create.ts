import type { World } from '@/ecs/world';
import { bindAbsentModels } from '../shared/objectVariants';

/**
 * The Deep Dungeon floors: floors 1, 2, 3 and 5 place type 79, which `Object91-95` have no `Object80.bmd` for
 * (LoadData.cpp:22-49 leaves the slot empty): it draws nothing.
 */
export async function createDeepDungeon(world: World) {
  const tiles = world.terrain?.MapTileObjects;
  if (tiles) bindAbsentModels(tiles, [79]);
}
