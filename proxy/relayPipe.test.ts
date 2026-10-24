import { describe, expect, it } from 'vitest';
import { RelayPipe, type TcpEnd, type WsEnd } from './relayPipe';

const LIMITS = { tcpQueueLimit: 32, preOpenLimit: 16 };

const bytes = (...values: number[]) => Uint8Array.from(values);
const run = (length: number, start = 0) => Uint8Array.from({ length }, (_, i) => (start + i) & 0xff);

class FakeWs implements WsEnd {
  sent: Uint8Array[] = [];
  closed: { code?: number; reason?: string } | null = null;
  status = 1;
  send(data: Uint8Array): number {
    if (this.status > 0) this.sent.push(data.slice());
    return this.status === 1 ? data.byteLength : this.status;
  }
  close(code?: number, reason?: string): void {
    this.closed ??= { code, reason };
  }
}

class FakeTcp implements TcpEnd {
  written: number[] = [];
  /** Bytes the socket accepts before it is "full"; Infinity = everything. */
  room = Infinity;
  ended = false;
  paused = false;
  flushes = 0;
  write(data: Uint8Array): number {
    if (this.ended) return -1;
    const n = Math.min(data.byteLength, this.room);
    this.room -= n;
    this.written.push(...data.subarray(0, n));
    return n;
  }
  flush(): void {
    this.flushes++;
  }
  end(): void {
    this.ended = true;
  }
  pause(): void {
    this.paused = true;
  }
  resume(): void {
    this.paused = false;
  }
}

describe('RelayPipe, browser to game server', () => {
  it('writes straight through once open', () => {
    const pipe = new RelayPipe(new FakeWs(), LIMITS);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);
    pipe.fromClient(bytes(0xc1, 0x04, 0xf4, 0x06));
    expect(tcp.written).toEqual([0xc1, 0x04, 0xf4, 0x06]);
    expect(tcp.flushes).toBeGreaterThan(0);
  });

  it('keeps frames sent before the socket opens and sends them first, after the PROXY header', () => {
    const pipe = new RelayPipe(new FakeWs(), LIMITS);
    pipe.fromClient(bytes(1, 2));
    pipe.fromClient(bytes(3));
    const tcp = new FakeTcp();
    expect(pipe.tcpOpened(tcp, bytes(0xaa, 0xbb))).toBe(true);
    pipe.fromClient(bytes(4));
    expect(tcp.written).toEqual([0xaa, 0xbb, 1, 2, 3, 4]);
    expect(pipe.queuedBytes).toBe(0);
  });

  it('copies a queued frame, so a reused message buffer cannot change it', () => {
    const pipe = new RelayPipe(new FakeWs(), LIMITS);
    const frame = bytes(1, 2, 3);
    pipe.fromClient(frame);
    frame.fill(9);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);
    expect(tcp.written).toEqual([1, 2, 3]);
  });

  it('closes both ends when the browser sends too much before the socket opens', () => {
    const ws = new FakeWs();
    const failures: string[] = [];
    const pipe = new RelayPipe(ws, LIMITS, reason => failures.push(reason));
    pipe.fromClient(run(10));
    pipe.fromClient(run(10));
    expect(pipe.closed).toBe(true);
    expect(failures).toEqual(['pre-open buffer full']);
    expect(ws.closed?.code).toBe(1009);
  });

  it('queues what a partial write left, keeps the order, and flushes on drain', () => {
    const pipe = new RelayPipe(new FakeWs(), LIMITS);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);
    tcp.room = 3;
    pipe.fromClient(run(5, 0)); // 0..4: 0,1,2 written, 3,4 queued
    pipe.fromClient(run(2, 5)); // 5,6 behind them, never ahead
    expect(tcp.written).toEqual([0, 1, 2]);
    expect(pipe.queuedBytes).toBe(4);

    tcp.room = 1;
    pipe.tcpDrain();
    expect(tcp.written).toEqual([0, 1, 2, 3]);

    tcp.room = Infinity;
    pipe.tcpDrain();
    expect(tcp.written).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(pipe.queuedBytes).toBe(0);
  });

  it('queues a write the socket refused whole (0 bytes)', () => {
    const pipe = new RelayPipe(new FakeWs(), LIMITS);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);
    tcp.room = 0;
    pipe.fromClient(bytes(7, 8));
    expect(pipe.queuedBytes).toBe(2);
    tcp.room = Infinity;
    pipe.tcpDrain();
    expect(tcp.written).toEqual([7, 8]);
  });

  it('closes both ends instead of growing the queue past its limit', () => {
    const ws = new FakeWs();
    const pipe = new RelayPipe(ws, LIMITS);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);
    tcp.room = 0;
    pipe.fromClient(run(20));
    pipe.fromClient(run(20));
    expect(pipe.reason).toBe('tcp queue full');
    expect(tcp.ended).toBe(true);
    expect(ws.closed?.code).toBe(1009);
    // Nothing after the close reaches the server.
    pipe.fromClient(bytes(1));
    expect(tcp.written).toEqual([]);
  });

  it('closes both ends when the socket write fails', () => {
    const ws = new FakeWs();
    const pipe = new RelayPipe(ws, LIMITS);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);
    tcp.ended = true;
    pipe.fromClient(bytes(1));
    expect(pipe.reason).toBe('tcp write failed');
    expect(ws.closed).not.toBeNull();
  });
});

describe('RelayPipe, game server to browser', () => {
  it('pauses the TCP socket under websocket backpressure and resumes on drain', () => {
    const ws = new FakeWs();
    const pipe = new RelayPipe(ws, LIMITS);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);

    expect(pipe.fromServer(bytes(1))).toBe(true);
    expect(tcp.paused).toBe(false);

    ws.status = -1; // queued by Bun, over the soft limit
    expect(pipe.fromServer(bytes(2))).toBe(true);
    expect(tcp.paused).toBe(true);
    expect(pipe.tcpPaused).toBe(true);

    pipe.wsDrain();
    expect(tcp.paused).toBe(false);
  });

  it('closes both ends when a send is dropped, rather than leave a hole in the stream', () => {
    const ws = new FakeWs();
    const pipe = new RelayPipe(ws, LIMITS);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);
    ws.status = 0;
    expect(pipe.fromServer(bytes(1))).toBe(false);
    expect(pipe.reason).toBe('ws send dropped');
    expect(tcp.ended).toBe(true);
    expect(pipe.fromServer(bytes(2))).toBe(false);
  });

  it('closes the websocket once when the game server goes', () => {
    const ws = new FakeWs();
    const pipe = new RelayPipe(ws, LIMITS);
    pipe.tcpOpened(new FakeTcp());
    pipe.serverClosed();
    pipe.serverClosed();
    expect(ws.closed).toEqual({ code: undefined, reason: undefined });
    expect(pipe.reason).toBe('server closed');
  });
});

describe('RelayPipe, closing', () => {
  it('ends a TCP socket that opens after the browser left (no leaked game-server slot)', () => {
    const pipe = new RelayPipe(new FakeWs(), LIMITS);
    pipe.fromClient(bytes(1, 2));
    pipe.clientClosed();
    const late = new FakeTcp();
    expect(pipe.tcpOpened(late, bytes(0xaa))).toBe(false);
    expect(late.ended).toBe(true);
    expect(late.written).toEqual([]);
  });

  it('writes what is still queued, then ends the socket, when the browser closes', () => {
    const pipe = new RelayPipe(new FakeWs(), LIMITS);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);
    tcp.room = 1;
    pipe.fromClient(bytes(1, 2, 3));
    tcp.room = Infinity;
    pipe.clientClosed();
    expect(tcp.written).toEqual([1, 2, 3]);
    expect(tcp.ended).toBe(true);
    pipe.clientClosed();
  });

  it('does not resume a socket after the pipe closed', () => {
    const ws = new FakeWs();
    const pipe = new RelayPipe(ws, LIMITS);
    const tcp = new FakeTcp();
    pipe.tcpOpened(tcp);
    ws.status = -1;
    pipe.fromServer(bytes(1));
    pipe.clientClosed();
    pipe.wsDrain();
    expect(tcp.paused).toBe(true);
  });
});
