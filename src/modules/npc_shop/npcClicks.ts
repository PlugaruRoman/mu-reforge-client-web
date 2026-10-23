/**
 * NPCs whose window a module opens itself on a click, before the talk request goes out (our C++
 * client's `UI/Reforge/ReforgeNpcTalk.cpp` `OwnWindowNpcs`: the Olympiad statue opens its window
 * without a talk, the Fort Herald opens it and talks). A module registers its NPC in `install`.
 */
export type NpcClick = { netId: number; name: string; npcType: number };

/** Answers true when it took the click (no talk request follows). */
type NpcClickHandler = (npc: NpcClick) => boolean;

const handlers = new Map<number, NpcClickHandler>();

/** The click on NPC number `npcType` goes to `handler` first. */
export function registerNpcClick(npcType: number, handler: NpcClickHandler): void {
  handlers.set(npcType, handler);
}

/** `npcTalkSystem`: whether a module took the click on `npc`. */
export function takeNpcClick(npc: NpcClick): boolean {
  return handlers.get(npc.npcType)?.(npc) ?? false;
}
