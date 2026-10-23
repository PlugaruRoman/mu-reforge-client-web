import { describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => {
  const data = new Map<string, string>();
  const g = globalThis as Record<string, unknown>;
  g.localStorage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
  // A profile saved before the window menu took U: every action written out, the session panel on U.
  data.set('mu_keys:Saved', JSON.stringify({ sessionStats: 'KeyU', inventory: 'KeyI' }));
  return data;
});

const { KeyBindings, setKeyProfile, setVersionKeyDefaults, resetKeyBindings } = await import('./keyBindings');

// NewUIHotKey.cpp:243-247: U toggles INTERFACE_WINDOW_MENU. The session panel is ours and takes
// F6, a key no handler of the original reads (NewUIHotKey.cpp, ZzzInterface.cpp).
describe('the window menu key', () => {
  it('is U, and the session panel is F6', () => {
    expect(KeyBindings.windowMenu).toBe('KeyU');
    expect(KeyBindings.sessionStats).toBe('F6');
  });

  it('moves a saved session panel off U', () => {
    setKeyProfile('Saved');
    expect(KeyBindings.sessionStats).toBe('F6');
    expect(KeyBindings.windowMenu).toBe('KeyU');
    expect(KeyBindings.inventory).toBe('KeyI');
    setKeyProfile('');
    expect(store.size).toBe(1);
  });
});

// GameVersion.keyDefaults: a version's own letters replace the client's defaults, a saved key still wins.
describe('a version\'s own default keys', () => {
  it('take over the defaults, unbind with an empty code, and yield to a saved key', () => {
    setVersionKeyDefaults({ hideUi: 'F9', skillList: '' });
    expect(KeyBindings.hideUi).toBe('F9');
    expect(KeyBindings.skillList).toBe('');
    expect(KeyBindings.inventory).toBe('KeyI');

    store.set('mu_keys:Mine', JSON.stringify({ hideUi: 'KeyH' }));
    setKeyProfile('Mine');
    expect(KeyBindings.hideUi).toBe('KeyH');
    expect(KeyBindings.skillList).toBe('');

    setKeyProfile('');
    resetKeyBindings();
    expect(KeyBindings.hideUi).toBe('F9');
    setVersionKeyDefaults({});
    expect(KeyBindings.skillList).toBe('KeyK');
  });
});
