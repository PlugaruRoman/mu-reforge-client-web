import { reaction } from 'mobx';
import { Ecs } from '@/ecs/current';
import { GameOptions } from '@/controllers/settings';
import { Hero } from '@/modules/hero';
import { serverSetting } from '../servers/serverManifest';
import { findHotkeyItem, UNBOUND_HOTKEY } from './itemHotkeys';
import { Bag } from './state';

/** Under this share of the bar the mana counts as run out. */
const LOW_MANA = 0.1;
/** At most one potion this often. */
const DRINK_MS = 1000;
/** The W key, unbound: the biggest mana potion in the bag (`GetHotKeyItemIndex`). */
const MANA_KEY = 1;

/**
 * Ours, where the world's `server.json` sets `autoManaPotion` and the player's option is on: mana
 * under a tenth drinks the potion the unbound W key would, through the same request. The original
 * never drinks by itself. Readme: "Automatic mana potion".
 */
export function installAutoMana(): void {
  let lastDrink = -Infinity;

  reaction(
    () => Hero.currentMP,
    mana => {
      if (!GameOptions.autoManaPotion || !serverSetting('autoManaPotion')) return;
      if (mana >= Hero.maxMP * LOW_MANA || Hero.currentHP <= 0 || !Ecs.world?.playerEntity) return;
      const now = Date.now();
      if (now - lastDrink < DRINK_MS) return;
      const slot = findHotkeyItem(Hero.items, MANA_KEY, UNBOUND_HOTKEY);
      if (slot < 0) return;
      lastDrink = now;
      Bag.consumeItemRequest(slot);
    }
  );
}

/** The last drink sent for a cast the mana refused. */
let lastCastDrink = -Infinity;

/**
 * The original's own rule, every server: a skill the mana cannot pay for is not cast, and the
 * biggest mana potion in the bag is drunk instead (`CheckMana` and the `FindManaItemIndex` calls in
 * SkillCast.cpp / ClassAttack.cpp). The MU Helper casts through the same gate, so it keeps a caster
 * going while away from the keyboard. Once a second at most: the cast is retried every frame.
 */
export function drinkManaForCast(): void {
  if (Hero.currentHP <= 0 || !Ecs.world?.playerEntity) return;
  const now = Date.now();
  if (now - lastCastDrink < DRINK_MS) return;
  const slot = findHotkeyItem(Hero.items, MANA_KEY, UNBOUND_HOTKEY);
  if (slot < 0) return;
  lastCastDrink = now;
  Bag.consumeItemRequest(slot);
}
