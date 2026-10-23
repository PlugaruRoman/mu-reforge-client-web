import { describe, expect, it } from 'vitest';
import { routeClientFrame } from './clientFrames';

// C1 04 FA 01: Mu Reforge's Item Collections list request (S MessageHandler/ItemCollections/ItemCollectionListRequestHandlerPlugIn.cs).
const fa = Uint8Array.from([0xc1, 0x04, 0xfa, 0x01]);
const fb = Uint8Array.from([0xc1, 0x06, 0xfb, 0x00, 0x01, 0x02]);
const walk = Uint8Array.from([0xc1, 0x06, 0xd4, 0x10, 0x20, 0x00]);

describe('routeClientFrame', () => {
  it('lets C1 FA through to the game server when the band is off', () => {
    expect(routeClientFrame(fa, false)).toBe('server');
  });

  it('keeps C1 FA for the band relay when the band is on', () => {
    expect(routeClientFrame(fa, true)).toBe('band');
  });

  it('keeps ping frames whether the band is on or off', () => {
    expect(routeClientFrame(fb, true)).toBe('ping');
    expect(routeClientFrame(fb, false)).toBe('ping');
  });

  it('sends every other frame to the server', () => {
    expect(routeClientFrame(walk, true)).toBe('server');
  });
});
