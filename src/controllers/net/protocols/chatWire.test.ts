import { describe, expect, it } from 'vitest';
import { fitUtf8, toChatWire } from './chatWire';

// The personal shop title: 26 bytes OpenMU reads as UTF-8 (PlayerShopOpen StoreName).
describe('fitUtf8', () => {
  it('keeps a title that fits as it is', () => {
    expect(fitUtf8('Cheap jewels', 26)).toBe('Cheap jewels');
  });

  it('cuts at the byte limit, never inside a character', () => {
    const russian = 'Дешёвые камни душ и благословения';
    const cut = fitUtf8(russian, 26);
    expect(cut).toBe('Дешёвые камни ');
    expect(toChatWire(cut).length).toBeLessThanOrEqual(26);
    // An emoji is 4 bytes: 25 bytes of ASCII leave no room for it.
    expect(fitUtf8(`${'a'.repeat(23)}😀`, 26)).toBe('a'.repeat(23));
  });
});
