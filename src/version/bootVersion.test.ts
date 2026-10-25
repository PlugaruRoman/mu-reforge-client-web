import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootVersionId, ensureActiveVersion, gameVersion } from './index';

// A published world's row arrives after boot, so the version switch must survive the reload by
// itself (sessionStorage), and a switch that did not take must not reload forever.
describe('the version switch across a reload', () => {
  const reload = vi.fn();
  const store = new Map<string, string>();

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
  });

  afterEach(() => {
    store.clear();
    reload.mockReset();
    vi.unstubAllGlobals();
  });

  it('boots into the version the last switch asked for, over the persisted selection', () => {
    expect(bootVersionId(undefined)).toBe('season6');
    vi.stubGlobal('location', { reload });

    expect(ensureActiveVersion('REFORGE')).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(bootVersionId(undefined)).toBe('reforge');
  });

  it('reloads once per tag: a second miss reports false without reloading', () => {
    vi.stubGlobal('location', { reload });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(ensureActiveVersion('REFORGE')).toBe(false);
    expect(ensureActiveVersion('REFORGE')).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the loaded version already plays the world', () => {
    vi.stubGlobal('location', { reload });

    expect(ensureActiveVersion(gameVersion.listTag)).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });
});
