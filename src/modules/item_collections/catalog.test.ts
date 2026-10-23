import { describe, expect, it } from 'vitest';
import {
  SlotFlag,
  bonusFormat,
  canRegister,
  formatHundredths,
  isComplete,
  listRequest,
  parseCatalog,
  parseRegisterResult,
  registerRequest,
  summarize,
  visibleIndexes,
} from './catalog';
import { catalogFrame } from './catalogFrame';

const swordSlot = [0, 0x05, 0x00, 9, SlotFlag.Excellent | SlotFlag.Available, 0b000101, 2];
const filledSlot = [7, 0x1d, 0x01, 0, SlotFlag.Filled, 0, 0];

describe('Item Collections catalog (C2 FA 01)', () => {
  const view = catalogFrame([
    { number: 3, category: 1, name: 'Blade Master', slots: [swordSlot, filledSlot], bonuses: [[6, 150], [10, 200]] },
    { number: 300, category: 2, name: 'Legend', slots: [filledSlot], bonuses: [[1, 5000]] },
  ]);
  const catalog = parseCatalog(view);

  it('reads every collection, its slots and bonuses', () => {
    expect(catalog.map(c => [c.number, c.category, c.name])).toEqual([
      [3, 1, 'Blade Master'],
      [300, 2, 'Legend'],
    ]);
    expect(catalog[0].slots[0]).toEqual({ group: 0, number: 5, minimumLevel: 9, flags: 0x05, excellentMask: 5, minimumOptionLevel: 2 });
    expect(catalog[0].slots[1]).toMatchObject({ group: 7, number: 285 });
    expect(catalog[0].bonuses).toEqual([
      { type: 6, hundredths: 150 },
      { type: 10, hundredths: 200 },
    ]);
  });

  it('knows the state of slots and collections', () => {
    expect(canRegister(catalog[0].slots[0])).toBe(true);
    expect(canRegister(catalog[0].slots[1])).toBe(false);
    expect(isComplete(catalog[0])).toBe(false);
    expect(isComplete(catalog[1])).toBe(true);
    expect(summarize(catalog)).toEqual({ completed: 1, collections: 2, filledSlots: 2, slots: 3 });
    expect(visibleIndexes(catalog, 0)).toEqual([0, 1]);
    expect(visibleIndexes(catalog, 2)).toEqual([1]);
  });

  it('stops at a collection that runs past the packet', () => {
    const bytes = new Uint8Array(view.buffer);
    const cut = bytes.length - 3;
    const short = Uint8Array.from([0xc2, cut >> 8, cut & 0xff, ...bytes.subarray(3, cut)]);
    expect(parseCatalog(new DataView(short.buffer)).map(c => c.number)).toEqual([3]);
  });
});

describe('Item Collections register (FA 02)', () => {
  it('reads the answer [result][collection u16 LE][slot]', () => {
    const answer = new DataView(Uint8Array.from([0xc1, 0x08, 0xfa, 0x02, 5, 0x2c, 0x01, 3]).buffer);
    expect(parseRegisterResult(answer)).toEqual({ result: 5, collection: 300, slot: 3 });
  });

  it('builds the requests as the handlers read them', () => {
    expect([...new Uint8Array(listRequest().buffer)]).toEqual([0xc1, 0x04, 0xfa, 0x01]);
    expect([...new Uint8Array(registerRequest(300, 2).buffer)]).toEqual([0xc1, 0x08, 0xfa, 0x02, 0x2c, 0x01, 2, 0xff]);
  });
});

describe('bonus text helpers', () => {
  it('formats hundredths and picks the sign', () => {
    expect([formatHundredths(150), formatHundredths(105), formatHundredths(200), formatHundredths(5)]).toEqual(['1.5', '1.05', '2', '0.05']);
    expect([bonusFormat(1), bonusFormat(10), bonusFormat(6)]).toEqual(['flat', 'decrease', 'percent']);
  });
});
