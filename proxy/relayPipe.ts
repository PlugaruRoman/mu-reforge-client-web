/**
 * The byte pipe between one browser websocket and its game-server TCP socket, with flow control
 * both ways (proxy/readme.md, "Limits"):
 *
 * - server -> browser: when `ws.send` reports backpressure (-1) the TCP socket is paused, and
 *   resumed on the websocket's `drain`. Bun keeps at most `backpressureLimit` per websocket and
 *   closes it past that (`closeOnBackpressureLimit`). A send that was dropped (0) closes both:
 *   a hole in the middle of an encrypted stream is never repaired, only noticed later.
 * - browser -> server: whatever `socket.write` did not take is queued, in order, and flushed on
 *   the socket's `drain`; a queue over `tcpQueueLimit` closes both.
 * - before the TCP socket is open, up to `preOpenLimit` bytes are kept and sent first thing on
 *   open (after the PROXY header, when there is one) instead of being dropped.
 * - a TCP socket that opens after the websocket is gone is ended at once, so a browser that
 *   closes during the connect cannot leave a socket holding a game-server slot.
 *
 * No Bun types here: the two ends are the small interfaces below, so the tests drive it with fakes.
 */

export interface WsEnd {
  /** Bun's `ServerWebSocket.send`: bytes sent, -1 when queued under backpressure, 0 when dropped. */
  send(data: Uint8Array): number;
  close(code?: number, reason?: string): void;
}

export interface TcpEnd {
  /** Bytes written; fewer than given (or <= 0) means the rest was not taken. */
  write(data: Uint8Array): number;
  flush(): void;
  end(): void;
  pause(): void;
  resume(): void;
}

export interface PipeLimits {
  tcpQueueLimit: number;
  preOpenLimit: number;
}

export type PipeCloseReason =
  | "client closed"
  | "server closed"
  | "tcp queue full"
  | "pre-open buffer full"
  | "ws send dropped"
  | "tcp write failed";

export class RelayPipe {
  private tcp: TcpEnd | null = null;
  private readonly queue: Uint8Array[] = [];
  private queued = 0;
  private paused = false;
  private closedReason: PipeCloseReason | null = null;

  constructor(
    private readonly ws: WsEnd,
    private readonly limits: PipeLimits,
    /** Called once, when the pipe closes for a reason of its own (not `client closed`). */
    private readonly onFail: (reason: PipeCloseReason) => void = () => {}
  ) {}

  get closed(): boolean {
    return this.closedReason !== null;
  }

  get reason(): PipeCloseReason | null {
    return this.closedReason;
  }

  get open(): boolean {
    return this.tcp !== null && !this.closed;
  }

  get queuedBytes(): number {
    return this.queued;
  }

  get tcpPaused(): boolean {
    return this.paused;
  }

  /**
   * The TCP socket connected. `first` (the PROXY header) goes before anything the browser sent.
   * Returns false, having ended the socket, when the websocket is already gone.
   */
  tcpOpened(tcp: TcpEnd, first?: Uint8Array): boolean {
    if (this.closed) {
      tcp.end();
      return false;
    }
    this.tcp = tcp;
    if (first?.byteLength) {
      this.queue.unshift(first);
      this.queued += first.byteLength;
    }
    this.flushQueue();
    return !this.closed;
  }

  /** A frame from the browser, for the game server. */
  fromClient(bytes: Uint8Array): void {
    if (this.closed || !bytes.byteLength) return;

    if (!this.tcp) {
      if (this.queued + bytes.byteLength > this.limits.preOpenLimit) return this.fail("pre-open buffer full");
      this.enqueue(bytes);
      return;
    }

    if (this.queue.length) {
      if (this.queued + bytes.byteLength > this.limits.tcpQueueLimit) return this.fail("tcp queue full");
      this.enqueue(bytes);
      this.flushQueue();
      return;
    }

    const written = this.tcp.write(bytes);
    if (written >= bytes.byteLength) {
      this.tcp.flush();
      return;
    }
    if (written < 0) return this.fail("tcp write failed");
    const rest = bytes.subarray(Math.max(0, written));
    if (rest.byteLength > this.limits.tcpQueueLimit) return this.fail("tcp queue full");
    this.enqueue(rest);
  }

  /** The TCP socket can take more. */
  tcpDrain(): void {
    if (!this.closed) this.flushQueue();
  }

  /** Bytes from the game server, for the browser. False when the pipe closed over them. */
  fromServer(bytes: Uint8Array): boolean {
    if (this.closed) {
      return false;
    }
    const status = this.ws.send(bytes);
    if (status === -1) {
      if (!this.paused && this.tcp) {
        this.paused = true;
        this.tcp.pause();
      }
      return true;
    }
    if (status === 0) {
      this.fail("ws send dropped");
      return false;
    }
    return true;
  }

  /** The websocket emptied its send buffer. */
  wsDrain(): void {
    if (this.paused && this.tcp && !this.closed) {
      this.paused = false;
      this.tcp.resume();
    }
  }

  /**
   * The websocket closed. Whatever is still queued gets one last write (a logout packet should
   * still arrive), then the socket ends. Safe to call more than once.
   */
  clientClosed(): void {
    if (this.closed) return;
    this.closedReason = "client closed";
    const tcp = this.tcp;
    if (tcp) {
      for (const chunk of this.queue) {
        if (tcp.write(chunk) < chunk.byteLength) break;
      }
      tcp.flush();
      tcp.end();
    }
    this.clear();
  }

  /** The game server closed or failed. Ends the websocket. Safe to call more than once. */
  serverClosed(): void {
    if (this.closed) return;
    this.closedReason = "server closed";
    this.tcp = null;
    this.clear();
    this.ws.close();
  }

  private enqueue(bytes: Uint8Array): void {
    // A copy: Bun may reuse the buffer a message arrived in once the handler returns.
    this.queue.push(bytes.slice());
    this.queued += bytes.byteLength;
  }

  private flushQueue(): void {
    const tcp = this.tcp;
    if (!tcp) return;
    let wrote = false;
    while (this.queue.length) {
      const chunk = this.queue[0];
      const written = tcp.write(chunk);
      if (written < 0) return this.fail("tcp write failed");
      if (written > 0) wrote = true;
      if (written >= chunk.byteLength) {
        this.queue.shift();
        this.queued -= chunk.byteLength;
        continue;
      }
      this.queue[0] = chunk.subarray(written);
      this.queued -= written;
      break;
    }
    if (wrote) tcp.flush();
  }

  private clear(): void {
    this.queue.length = 0;
    this.queued = 0;
  }

  private fail(reason: PipeCloseReason): void {
    if (this.closed) return;
    this.closedReason = reason;
    const tcp = this.tcp;
    this.tcp = null;
    this.clear();
    tcp?.end();
    this.ws.close(reason === "tcp queue full" || reason === "pre-open buffer full" ? 1009 : 1011, reason);
    this.onFail(reason);
  }
}
