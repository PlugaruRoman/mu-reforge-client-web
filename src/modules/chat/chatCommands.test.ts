import { describe, expect, it, vi } from 'vitest';
import { localCommandOf, runHandOverCommand, setHandOverCommand } from './chatCommands';

// A typed `/offlevel` or `/offstore` must take the window buttons' path (offline_modes), or the
// resume logs straight back in over the offline session (S LoginAction.cs stops it).
describe('the offline hand-over commands', () => {
  it('are run on this client, not sent as they are', () => {
    expect(localCommandOf('/offlevel')?.local).toBe('offlevel');
    expect(localCommandOf('/OFFSTORE ')?.local).toBe('offstore');
  });

  it("run the module's hand-over, and report none when no module took them", () => {
    const run = vi.fn();
    setHandOverCommand('offlevel', run);
    try {
      expect(runHandOverCommand('offlevel')).toBe(true);
      expect(run).toHaveBeenCalledTimes(1);
      expect(runHandOverCommand('offstore')).toBe(false);
    } finally {
      setHandOverCommand('offlevel', null);
    }
    expect(runHandOverCommand('offlevel')).toBe(false);
  });
});
