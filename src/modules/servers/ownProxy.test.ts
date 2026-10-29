import { describe, expect, it } from 'vitest';
import { WS_HOST } from './defaults';
import { isOwnProxy } from './serverConfig';

// A pinned build takes its world from localStorage before the fetch answers: only one on the
// build's own proxy may be played, or a planted cache sends the login to another relay.
describe('isOwnProxy', () => {
  const host = new URL(WS_HOST).hostname;

  it('takes a world on the build proxy, any port', () => {
    expect(isOwnProxy({ wsUrl: `ws://${host}:3000` })).toBe(true);
    expect(isOwnProxy({ wsUrl: `wss://${host}` })).toBe(true);
  });

  it('refuses another relay, a look-alike host and garbage', () => {
    expect(isOwnProxy({ wsUrl: 'wss://evil.example' })).toBe(false);
    expect(isOwnProxy({ wsUrl: `wss://${host}.evil.example` })).toBe(false);
    expect(isOwnProxy({ wsUrl: 'not a url' })).toBe(false);
  });
});
