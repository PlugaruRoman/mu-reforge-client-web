import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameServerTarget, matchesSearch, type ServerProfile } from './serverConfig';

const world = (patch: Partial<ServerProfile> = {}): ServerProfile => ({
  id: 'list:ignies.net',
  name: 'Ignies',
  csHost: '127.0.0.1',
  csPort: 44405,
  wsUrl: 'wss://ws.ignies.net',
  gsAddress: 'auto',
  listed: true,
  domain: 'ignies.net',
  description: 'Season 6 Episode 3, played in the browser',
  language: 'es',
  version: 'S6EP3',
  ...patch,
});

describe('matchesSearch', () => {
  it('keeps every world when nothing was typed', () => {
    expect(matchesSearch(world(), '')).toBe(true);
    expect(matchesSearch(world(), '   ')).toBe(true);
  });

  it('matches the name, whatever the case', () => {
    expect(matchesSearch(world(), 'IGN')).toBe(true);
    expect(matchesSearch(world(), 'lorencia')).toBe(false);
  });

  it('matches what the world says about itself, not only its name', () => {
    expect(matchesSearch(world(), 'episode 3')).toBe(true);
    expect(matchesSearch(world(), 's6ep3')).toBe(true);
    expect(matchesSearch(world(), 'es')).toBe(true);
    expect(matchesSearch(world(), 'ignies.net')).toBe(true);
  });

  it('matches a game server or channel the list named', () => {
    const named = world({
      servers: [
        { id: 0, name: 'Valhalla', channels: [{ id: 0, name: 'Peaceful' }] },
      ],
    });

    expect(matchesSearch(named, 'valhalla')).toBe(true);
    expect(matchesSearch(named, 'peaceful')).toBe(true);
    expect(matchesSearch(world(), 'valhalla')).toBe(false);
  });

  it('narrows with every word rather than widening', () => {
    expect(matchesSearch(world(), 'ignies browser')).toBe(true);
    expect(matchesSearch(world(), 'ignies lorencia')).toBe(false);
  });

  it('searches a saved profile by the address it was typed with', () => {
    const saved = world({
      id: 'local',
      name: 'Local (OpenMU)',
      listed: false,
      domain: undefined,
      description: undefined,
      language: undefined,
      version: undefined,
    });

    expect(matchesSearch(saved, '127.0.0.1')).toBe(true);
    expect(matchesSearch(saved, '44405')).toBe(true);
    expect(matchesSearch(saved, 'openmu')).toBe(true);
  });
});

describe('the ?cs= override', () => {
  it('builds its profile when no profile is saved or seeded', async () => {
    vi.resetModules();
    vi.stubGlobal('location', { search: '?cs=10.0.0.5:44405', hostname: 'play.example.com', protocol: 'https:' });
    try {
      const { ServerConfig } = await import('./serverConfig');

      expect(ServerConfig.urlProfile?.csHost).toBe('10.0.0.5');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('a page served from a LAN address', () => {
  it('seeds the local world on the proxy of the page host', async () => {
    vi.resetModules();
    vi.stubGlobal('location', { search: '', hostname: '192.168.1.20', protocol: 'http:' });
    try {
      const { ServerConfig } = await import('./serverConfig');
      const { WS_PORT } = await import('./defaults');

      expect(ServerConfig.profiles.map(p => p.wsUrl)).toEqual([`ws://192.168.1.20:${WS_PORT}`]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('the local world of a build that names its client (VITE_CS_VERSION)', () => {
  async function build(saved?: object) {
    vi.resetModules();
    vi.stubEnv('VITE_CS_VERSION', 'REFORGE');
    const store = new Map<string, string>(saved ? [['mu_servers', JSON.stringify(saved)]] : []);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
    vi.stubGlobal('location', { search: '', hostname: 'localhost', protocol: 'http:' });
    return (await import('./serverConfig')).ServerConfig;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('seeds the local world with that client', async () => {
    const config = await build();

    expect(config.profiles.map(p => [p.id, p.version])).toEqual([['local', 'REFORGE']]);
  });

  it('tags a saved local world that named none, never a typed one', async () => {
    const typed = { id: 's1', name: 'Mine', csHost: '10.0.0.5', csPort: 44405, wsUrl: 'ws://10.0.0.5:3000', gsAddress: 'auto' };
    const config = await build({ profiles: [{ ...typed, id: 'local', name: 'Local (OpenMU)' }, typed], activeId: 'local' });

    expect(config.profiles.map(p => [p.id, p.version])).toEqual([['local', 'REFORGE'], ['s1', undefined]]);
    expect(config.active.version).toBe('REFORGE');
  });
});

describe('a pinned build (VITE_PINNED_WORLD)', () => {
  const OURS = '[1:REFORGE:Mu Reforge:Molten x100:en](play.mureforge.com:44406@wss://ws.mureforge.com)';
  const EVIL = '[1:REFORGE:Evil:Phishing:en](evil.example.com:44406@wss://ws.evil.example.com)';

  async function pinnedBuild(search: string) {
    vi.resetModules();
    vi.stubEnv('VITE_PINNED_WORLD', 'on');
    vi.stubEnv('VITE_SERVER_LIST_URL', 'https://web.mureforge.com/serverlist.md');
    vi.stubEnv('VITE_CS_HOST', 'play.mureforge.com');
    vi.stubGlobal('location', { search, hostname: 'web.mureforge.com', protocol: 'https:' });
    const { LocalStorage } = await import('../../core/localStorage');
    // A profile and a list another visit left behind.
    LocalStorage.save('mu_servers', JSON.stringify({
      profiles: [{ id: 's1', name: 'Planted', csHost: 'evil.example.com', csPort: 44406, wsUrl: 'wss://ws.evil.example.com', gsAddress: 'auto' }],
      activeId: 's1',
    }));
    LocalStorage.save('mu_serverlist', EVIL);
    return {
      ...(await import('./serverConfig')),
      ...(await import('./serverList')),
    };
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ignores every URL override and every saved profile', async () => {
    const { ServerConfig, listUrl } = await pinnedBuild(
      '?ws=wss://evil.example.com&cs=evil.example.com:44406&list=https://evil.example.com/l.md&version=S6EP3&server=s1'
    );

    expect(ServerConfig.urlProfile).toBeNull();
    expect(ServerConfig.profiles).toEqual([]);
    expect(ServerConfig.all).toEqual([]);
    expect(ServerConfig.readOnly).toBe(true);
    expect(listUrl()).toBe('https://web.mureforge.com/serverlist.md');
  });

  it("selects the first world of its own list, never a cached unpinned one", async () => {
    const { ServerConfig, refreshServerList, wsAddress, connectServerAddress } = await pinnedBuild('?list=https://evil.example.com/l.md');
    const fetched = vi.fn(async () => new Response(`${OURS}\n${EVIL}\n`));
    vi.stubGlobal('fetch', fetched);

    await refreshServerList();

    expect(fetched).toHaveBeenCalledWith('https://web.mureforge.com/serverlist.md', expect.anything());
    expect(ServerConfig.all.map(w => w.name)).toEqual(['Mu Reforge']);
    expect(ServerConfig.active.version).toBe('REFORGE');
    expect(wsAddress()).toBe('wss://ws.mureforge.com');
    expect(connectServerAddress()).toEqual({ host: 'play.mureforge.com', port: 44406 });
    // Nothing the player does adds another.
    ServerConfig.add({ csHost: 'evil.example.com' });
    expect(ServerConfig.all.map(w => w.name)).toEqual(['Mu Reforge']);
  });

  it('keeps the upstream overrides when the switch is off', async () => {
    vi.resetModules();
    vi.stubGlobal('location', { search: '?ws=wss://other.example.com', hostname: 'web.mureforge.com', protocol: 'https:' });
    const { ServerConfig } = await import('./serverConfig');

    expect(ServerConfig.urlProfile?.wsUrl).toBe('wss://other.example.com');
  });
});

// `PROXY_TARGETS` (proxy/addressRewrite.ts): the proxy hands the client an
// alias with port 0 in place of the game server's address.
describe('gameServerTarget with a proxy alias', () => {
  it('passes the alias through untouched, with no fallback', () => {
    expect(gameServerTarget('molten-1', 0)).toEqual({ host: 'molten-1', fallback: null });
  });

  it('weighs a real address as before', () => {
    // A public address advertised by a server reached on loopback (the build
    // default) is kept as the fallback, as it always was.
    const real = gameServerTarget('169.58.146.212', 55901);
    expect(real.host === '169.58.146.212' || real.fallback === '169.58.146.212').toBe(true);
    // A single-label name with a real port is a LAN host, not an alias.
    expect(gameServerTarget('mu-server', 55901).fallback).not.toBeNull();
  });
});
