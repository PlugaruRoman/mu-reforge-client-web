import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { Session, csRedialDelay } = await import('./state');
const { resumeDelay } = await import('./sessionResume');

describe('Session.sendToGS', () => {
  it('sends only the bytes its DataView covers, not the whole buffer under it', () => {
    const sent: Uint8Array[] = [];
    Session.gsSocket = { readyState: WebSocket.OPEN, send: (p: Uint8Array) => sent.push(p) } as unknown as WebSocket;
    const buffer = new Uint8Array([9, 9, 9, 9, 0xc1, 4, 0xe8, 0, 9, 9]).buffer;

    Session.sendToGS(new DataView(buffer, 4, 4));
    Session.gsSocket = undefined;

    expect(sent).toHaveLength(1);
    expect(sent[0].byteLength).toBe(4);
    expect([sent[0][0], sent[0][1]]).toEqual([0xc1, 4]);
  });
});

// CLoginWin::CancelLogin (LoginWin.cpp:416-427): the game server goes, the connect server is
// dialled again and the server list shows; the typed fields stay.
describe('Session.cancelLogin', () => {
  it('goes back to the server list', async () => {
    const { AppState, UIState } = await import('@/controllers/interface/uiState');
    const dial = vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => undefined);
    const close = vi.fn();
    Session.gsSocket = { close } as unknown as WebSocket;
    Session.username = 'hero';
    Session.loginError = 'Wrong password';
    AppState.uiState = UIState.Login;

    Session.cancelLogin();

    expect(close).toHaveBeenCalled();
    expect(Session.gsSocket).toBeUndefined();
    expect(dial).toHaveBeenCalled();
    expect(AppState.uiState).toBe(UIState.Servers);
    expect(Session.loginError).toBeUndefined();
    expect(Session.username).toBe('hero');
    dial.mockRestore();
  });
});

// Our server checks the C3 counter (S PipelinedSimpleModulusDecryptor.cs): a packet encrypted and
// then not sent leaves the next one, the login, a step ahead, and the connection is dropped.
describe('the C3 counter', () => {
  const internals = Session as unknown as { encryptor?: { Encrypt(p: Uint8Array): Uint8Array }; gsHandshake: boolean };
  const c3 = () => new DataView(new Uint8Array([0xc3, 4, 0x0e, 0]).buffer);

  function socket(readyState: number) {
    const sent: Uint8Array[] = [];
    Session.gsSocket = { readyState, send: (p: Uint8Array) => sent.push(p) } as unknown as WebSocket;
    const encrypt = vi.fn((p: Uint8Array) => p);
    internals.encryptor = { Encrypt: encrypt };
    return { sent, encrypt };
  }

  afterEach(() => {
    Session.gsSocket = undefined;
    internals.encryptor = undefined;
    internals.gsHandshake = false;
  });

  it('is not moved for a socket that is still connecting', () => {
    const { sent, encrypt } = socket(WebSocket.CONNECTING);
    Session.sendToGS(c3());
    expect(encrypt).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });

  it('goes to the login first on a new game server: other C3 packets wait for it', () => {
    const { sent, encrypt } = socket(WebSocket.OPEN);
    internals.gsHandshake = true;
    Session.sendToGS(c3());
    expect(encrypt).not.toHaveBeenCalled();
    // C1 never touches the counter.
    Session.sendToGS(new DataView(new Uint8Array([0xc1, 4, 0xd4, 0]).buffer));
    Session.sendToGS(c3(), true);
    expect(encrypt).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
    Session.onLoginAccepted();
    Session.sendToGS(c3());
    expect(encrypt).toHaveBeenCalledTimes(2);
  });

  it('sends the login itself as the handshake', () => {
    const { sent } = socket(WebSocket.OPEN);
    internals.gsHandshake = true;
    Session.loginRequest('hero', 'secret');
    expect(sent).toHaveLength(1);
    expect(sent[0][0]).toBe(0xc3);
  });
});

describe('re-dialling a lost connect server', () => {
  it('waits 2 s doubling to 30 s, a random half taken off', () => {
    expect(csRedialDelay(0, () => 0)).toBe(1000);
    expect(csRedialDelay(0, () => 1)).toBe(2000);
    expect(csRedialDelay(2, () => 1)).toBe(8000);
    expect(csRedialDelay(10, () => 1)).toBe(30_000);
    expect(csRedialDelay(10, () => 0)).toBe(15_000);
  });

  // A server restart takes minutes (DEPLOY-FLOW): the list keeps dialling and never needs a page reload.
  it('never dials at once, and never gives up', async () => {
    const { AppState, UIState } = await import('@/controllers/interface/uiState');
    vi.useFakeTimers();
    const dial = vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => {
      Session.csSocket = {} as WebSocket;
    });
    try {
      AppState.uiState = UIState.Servers;
      const lose = () => Session.onSocketLost(Session.csSocket as WebSocket);
      Session.csSocket = {} as WebSocket;
      for (let i = 0; i < 20; i++) {
        lose();
        expect(dial).toHaveBeenCalledTimes(i);
        expect(Session.csReconnecting).toBe(true);
        vi.advanceTimersByTime(30_000);
        expect(dial).toHaveBeenCalledTimes(i + 1);
      }
      // A connect server that answers ends the reconnecting state and starts the count over.
      Session.onConnectServerReached();
      expect(Session.csReconnecting).toBe(false);
    } finally {
      vi.useRealTimers();
      dial.mockRestore();
      Session.csSocket = undefined;
    }
  });

  it('dials at once on Retry now, back online or the page shown again, and waits while hidden', async () => {
    const { AppState, UIState } = await import('@/controllers/interface/uiState');
    const { EventBus } = await import('@/core/eventBus');
    const { installNet } = await import('./net');
    installNet();
    vi.useFakeTimers();
    const hidden = { hidden: true };
    vi.stubGlobal('document', hidden);
    const dial = vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => {
      Session.csSocket = {} as WebSocket;
    });
    try {
      AppState.uiState = UIState.Servers;
      Session.csSocket = {} as WebSocket;
      Session.onSocketLost(Session.csSocket);
      // Hidden: nothing is dialled however long it stays so.
      vi.advanceTimersByTime(600_000);
      expect(dial).not.toHaveBeenCalled();
      hidden.hidden = false;
      EventBus.emit('pageVisibilityChanged', true);
      expect(dial).toHaveBeenCalledTimes(1);

      // Retry now while a re-dial waits: at once, and only one socket at a time.
      Session.onSocketLost(Session.csSocket as WebSocket);
      Session.retryConnectServerNow();
      Session.retryConnectServerNow();
      expect(dial).toHaveBeenCalledTimes(2);

      Session.onConnectServerReached();
      Session.retryConnectServerNow();
      expect(dial).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      dial.mockRestore();
      Session.csSocket = undefined;
    }
  });

  it('dials for a channel click with no connect server, and sends it on the Hello', () => {
    const dial = vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => {
      Session.csSocket = { readyState: WebSocket.CONNECTING } as WebSocket;
    });
    const request = new DataView(new Uint8Array([0xc1, 0x06, 0xf4, 0x03, 0, 0]).buffer);
    try {
      Session.csSocket = undefined;
      Session.sendToCSWhenOpen(request);
      expect(dial).toHaveBeenCalledTimes(1);
      const sent: DataView[] = [];
      Session.csSocket = { readyState: WebSocket.OPEN, send: (b: DataView) => sent.push(b) } as unknown as WebSocket;
      Session.onConnectServerReached();
      expect(sent).toEqual([request]);
      // Sent once: the next Hello has nothing held.
      Session.onConnectServerReached();
      expect(sent).toHaveLength(1);
    } finally {
      dial.mockRestore();
      Session.csSocket = undefined;
    }
  });

  // A first visit with the list unreadable: `active` is the placeholder, which is no address to dial.
  it('dials nothing while there is no world, and keeps waiting for one', async () => {
    const { ServerConfig } = await import('../servers/serverConfig');
    const { AppState, UIState } = await import('@/controllers/interface/uiState');
    vi.useFakeTimers();
    const empty = noWorlds(ServerConfig);
    try {
      AppState.uiState = UIState.Servers;
      Session.connectToConnectServer();
      expect(Session.csSocket).toBeUndefined();
      expect(Session.csReconnecting).toBe(true);
      vi.advanceTimersByTime(30_000);
      expect(Session.csSocket).toBeUndefined();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      empty.restore();
      Session.onConnectServerReached();
    }
  });
});

describe('resume backoff', () => {
  it('spreads each step from half to one and a half of it', () => {
    expect(resumeDelay(0, () => 0)).toBe(500);
    expect(resumeDelay(0, () => 1)).toBe(1500);
    expect(resumeDelay(9, () => 0.5)).toBe(15_000);
  });
});

/** No saved world and no listed one (`ServerConfig.isEmpty`), until `restore`. */
function noWorlds(config: { profiles: unknown[]; isEmpty: boolean; setListed(entries: never[]): void }) {
  const saved = config.profiles;
  runInAction(() => (config.profiles = []));
  config.setListed([]);
  expect(config.isEmpty).toBe(true);
  return { restore: () => runInAction(() => (config.profiles = saved)) };
}

// OpenMU tells the login layouts apart by length (LogInHandlerPlugIn: `< 42` is short), so a
// 50-byte short login is read with the long layout and its client version is lost. Reforge sends
// our client's 60-byte LoginLongPassword: version at 38, serial at 43, a 20-byte password.
describe('the login packet', () => {
  async function sentLogin(loginPacket: 'short' | 'long' | undefined): Promise<Uint8Array> {
    const { gameVersion } = await import('@/version');
    const v = gameVersion as unknown as { protocol: Record<string, unknown> };
    const saved = v.protocol;
    v.protocol = { ...saved, loginPacket };
    const sent: Uint8Array[] = [];
    const spy = vi.spyOn(Session, 'sendToGS').mockImplementation((p: DataView) => {
      sent.push(new Uint8Array(p.buffer, p.byteOffset, p.byteLength).slice());
    });
    try {
      (Session as unknown as { sendLogin(u: string, p: string): void }).sendLogin('test0', 'a-password-of-16');
    } finally {
      spy.mockRestore();
      v.protocol = saved;
    }
    return sent[0];
  }

  it('is the 60-byte long layout when the version asks for it, version at 38', async () => {
    const { gameVersion } = await import('@/version');
    const bytes = await sentLogin('long');
    expect(bytes.byteLength).toBe(60);
    expect([...bytes.subarray(38, 43)]).toEqual([...gameVersion.clientVersionBytes]);
    expect([...bytes.subarray(43, 59)]).toEqual([...gameVersion.serialBytes]);
  });

  it('keeps all 16 password characters in the long layout and cuts them to 10 in the short one', async () => {
    const xor3 = [0xfc, 0xcf, 0xab];
    const plain = (b: Uint8Array, from: number, len: number) =>
      String.fromCharCode(...[...b.subarray(from, from + len)].map((c, i) => c ^ xor3[i % 3]).filter(c => c !== 0));
    expect(plain(await sentLogin('long'), 14, 20)).toBe('a-password-of-16');
    expect(plain(await sentLogin(undefined), 14, 10)).toBe('a-password');
  });

  it('stays the 50-byte short layout by default', async () => {
    expect((await sentLogin(undefined)).byteLength).toBe(50);
  });
});
