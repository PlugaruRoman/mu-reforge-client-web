import { setDockOrder } from '@/controllers/interface/components/mu_window';
import { gameVersion } from '@/version';

/**
 * Our client's docking (Interface/RmlUi/workspace.rml `.dock-right`, row-reverse): the open classic
 * windows pack from the right edge in this order, with no gap. The character window takes the edge,
 * the inventory goes left of whatever is open before it, and a vault, shop or trade window goes left
 * of the inventory. By the web window ids (MuItemWindow `id`).
 */
export const REFORGE_DOCK_ORDER: readonly string[] = [
  'character-info',
  'mu-helper',
  'party-window',
  'guild-window',
  'command-window',
  'npc-dialogue',
  'quest-progress',
  'npc-quest',
  'my-quest',
  'pet-info',
  'quest-list',
  'inventory',
  'vault',
  'guild_bank',
  'npc-shop',
  'chaos-machine',
  'trade',
  'my-shop',
  'shop-browse',
];

/**
 * Mu Reforge docks like its own client; the other versions keep the original's fixed columns. A
 * world with the reforge modules is ours (season 6 and 0.97d list them in `modulesOff`).
 */
export function applyDockOrder(): void {
  const reforge = !(gameVersion.modulesOff ?? []).includes('reforge_hud');
  setDockOrder(reforge ? REFORGE_DOCK_ORDER : null);
}
