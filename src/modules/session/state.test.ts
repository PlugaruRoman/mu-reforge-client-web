import { afterEach, describe, expect, it, vi } from 'vitest';

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

  it('never dials at once, and stops after six tries', async () => {
    const { AppState, UIState } = await import('@/controllers/interface/uiState');
    vi.useFakeTimers();
    const dial = vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => {
      Session.csSocket = {} as WebSocket;
    });
    try {
      AppState.uiState = UIState.Servers;
      const lose = () => Session.onSocketLost(Session.csSocket as WebSocket);
      Session.csSocket = {} as WebSocket;
      for (let i = 0; i < 6; i++) {
        lose();
        expect(dial).toHaveBeenCalledTimes(i);
        vi.advanceTimersByTime(30_000);
        expect(dial).toHaveBeenCalledTimes(i + 1);
      }
      lose();
      vi.advanceTimersByTime(120_000);
      expect(dial).toHaveBeenCalledTimes(6);
      // A connect server that answers starts the count over.
      Session.onConnectServerReached();
    } finally {
      vi.useRealTimers();
      dial.mockRestore();
      Session.csSocket = undefined;
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
