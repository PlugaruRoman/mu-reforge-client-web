import { describe, expect, it } from 'vitest';
import { isOn } from './buildFlags';

describe('isOn', () => {
  it('reads on, 1, true and yes in any case as set', () => {
    for (const value of ['on', 'ON', '1', 'true', ' Yes ']) expect(isOn(value)).toBe(true);
  });

  it('reads anything else as not set', () => {
    for (const value of [undefined, '', 'off', '0', 'false', 'no', 'REFORGE']) expect(isOn(value)).toBe(false);
  });
});
