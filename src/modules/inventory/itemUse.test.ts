import { describe, expect, it } from 'vitest';
import type { Item } from '@/ecs/world';
import { isRightClickConsumable } from './itemUse';

const item = (group: number, num: number) => ({ group, num }) as Item;

describe('the right click use (TryConsumeItem, kept to our server handlers)', () => {
  it('uses the potions and the scrolls the original client drinks', () => {
    for (const num of [0, 3, 6, 7, 8, 9, 10, 35, 38, 40]) expect(isRightClickConsumable(item(14, num))).toBe(true);
  });

  it('uses the X-shop buff scrolls, elite potions and the event food', () => {
    for (const num of [70, 71, 72, 73, 74, 75, 76, 77, 97, 98, 133, 46, 50, 85, 87]) {
      expect(isRightClickConsumable(item(14, num))).toBe(true);
    }
  });

  it('uses the Magic Backpack, the Vault Expansion Certificate, the Life Stone and the Kalima ticket', () => {
    expect(isRightClickConsumable(item(14, 162))).toBe(true);
    expect(isRightClickConsumable(item(14, 163))).toBe(true);
    expect(isRightClickConsumable(item(13, 11))).toBe(true);
    expect(isRightClickConsumable(item(13, 48))).toBe(true);
  });

  it('leaves what our server has no handler for: elixirs, Remedy of Love, jewels, talismans, reset fruits', () => {
    for (const num of [11, 13, 14, 20, 78, 82, 94, 124, 164]) expect(isRightClickConsumable(item(14, num))).toBe(false);
    for (const num of [15, 54, 60, 81, 82]) expect(isRightClickConsumable(item(13, num))).toBe(false);
    expect(isRightClickConsumable(item(0, 0))).toBe(false);
  });
});
