import { describe, expect, it, vi } from 'vitest';

const protocol: { serverGroupSize?: number } = {};
vi.mock('@/version', () => ({ gameVersion: { protocol } }));

const { serverChannelOf, serverGroupOf } = await import('./serverGroups');

describe('server list groups', () => {
  it('files ids by their high byte when the version sets no group size', () => {
    delete protocol.serverGroupSize;
    expect([serverGroupOf(20), serverChannelOf(20)]).toEqual([0, 20]);
    expect([serverGroupOf(0x103), serverChannelOf(0x103)]).toEqual([1, 3]);
  });

  // Mu Reforge: our C++ client's id / 20 - Molten 0-19 and Inferno 20-39 are two buttons.
  it('files ids by twenties for Mu Reforge', () => {
    protocol.serverGroupSize = 20;
    expect([serverGroupOf(2), serverChannelOf(2)]).toEqual([0, 2]);
    expect([serverGroupOf(20), serverChannelOf(20)]).toEqual([1, 0]);
    expect([serverGroupOf(22), serverChannelOf(22)]).toEqual([1, 2]);
  });
});
