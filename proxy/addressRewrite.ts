import {
  SimpleModulusDecryptor,
  SimpleModulusEncryptor,
  SimpleModulusKeys,
} from '../src/controllers/net/encryption/simpleModulus';
import { gameVersion } from '../versions/season6';
import { aliasFor, type AliasTable } from './targetAliases';

/**
 * Server addresses out of the server -> browser stream (PROXY_TARGETS, targetAliases.ts).
 *
 * Two packets carry one of our addresses to the client:
 *
 * - `C1 16 F4 03` ConnectionInfo (connect server, plain): a 16-byte IP string at 4 and the
 *   game server's port, little-endian, at 20. The string becomes the alias of that `ip:port`
 *   and the port 0 - the client dials `?host=<alias>&port=0` and the proxy resolves the name.
 * - `C3 .. CA` ChatRoomConnectionInfo (game server, SimpleModulus): a 15-byte IP string at 3
 *   of the decrypted packet and no port (the chat server's is fixed, `chatPort`). It is decrypted,
 *   given the alias of `ip:chatPort` and encrypted again under the counter it came with, so the
 *   client's counter is none the wiser.
 *
 * An address the table does not name becomes `UNLISTED_ALIAS`: with aliases on the proxy would
 * refuse the raw address anyway, so passing it through would only leak it.
 *
 * Every other frame is passed through untouched and unbuffered: only a frame that could be one
 * of the two (by header and length) is held until it is complete, so a frame split across TCP
 * reads is rewritten whole, and several in one read are each looked at. The output is always
 * the same length as what went in, minus a held tail that goes out with the next read.
 */

const CONNECTION_INFO_LENGTH = 22;
const CONNECTION_INFO_IP = 4;
const CONNECTION_INFO_IP_LENGTH = 16;
const CONNECTION_INFO_PORT = 20;

const CHAT_INFO_LENGTH = 36;
const CHAT_INFO_IP = 3;
const CHAT_INFO_IP_LENGTH = 15;

const SERVER_DECRYPTION_KEYS = [...gameVersion.protocol.encryption.serverToClient];

/** What the game server encrypts with; the round trip is checked on every rewrite. */
const SERVER_ENCRYPTION_KEYS = SimpleModulusEncryptor.DefaultServerKey;

/** A ChatRoomConnectionInfo on the wire: header, then the content plus the counter in 11-byte blocks. */
const CHAT_INFO_WIRE_LENGTH = (() => {
  const plain = new Uint8Array(CHAT_INFO_LENGTH);
  plain[0] = 0xc3;
  plain[1] = CHAT_INFO_LENGTH;
  return new SimpleModulusEncryptor().GetEncryptedSize(plain);
})();

const EMPTY = new Uint8Array(0);

export type RewriteNote =
  | { kind: 'connection-info'; from: string; to: string }
  | { kind: 'chat-info'; from: string; to: string }
  | { kind: 'chat-info-failed' };

function readString(bytes: Uint8Array, from: number, length: number): string {
  let text = '';
  for (let i = from; i < from + length && bytes[i] !== 0; i++) text += String.fromCharCode(bytes[i]);
  return text.trim();
}

function writeString(bytes: Uint8Array, from: number, length: number, text: string): void {
  bytes.fill(0, from, from + length);
  for (let i = 0; i < text.length && i < length; i++) bytes[from + i] = text.charCodeAt(i);
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export class AddressRewriter {
  private pending: Uint8Array = EMPTY;
  /** Bytes of a pass-through frame still to come in later reads. */
  private skip = 0;

  constructor(
    private readonly table: AliasTable,
    private readonly chatPort: number,
    /** Every rewrite and failure, for the proxy's log. */
    private readonly note: (note: RewriteNote) => void = () => {}
  ) {}

  /** Bytes held back for the next read: an incomplete header or candidate frame. */
  get heldBytes(): number {
    return this.pending.length;
  }

  /**
   * One read from the server. Returns what to forward now: `chunk` itself when nothing changed
   * and nothing is held, else a copy. Never mutates `chunk`.
   */
  feed(chunk: Uint8Array): Uint8Array {
    let data = chunk;
    let owned = false;
    if (this.pending.length) {
      data = new Uint8Array(this.pending.length + chunk.length);
      data.set(this.pending, 0);
      data.set(chunk, this.pending.length);
      owned = true;
      this.pending = EMPTY;
    }

    let pos = 0;
    let hold = -1;

    while (pos < data.length) {
      if (this.skip > 0) {
        const step = Math.min(this.skip, data.length - pos);
        pos += step;
        this.skip -= step;
        continue;
      }

      const header = data[pos];
      if (header < 0xc1 || header > 0xc4) {
        // Not a frame start: forwarded as it is, and the next byte is tried (the client resyncs
        // the same way).
        pos++;
        continue;
      }

      const headerSize = header === 0xc1 || header === 0xc3 ? 2 : 3;
      if (data.length - pos < headerSize) {
        hold = pos;
        break;
      }

      const size = headerSize === 2 ? data[pos + 1] : (data[pos + 1] << 8) | data[pos + 2];
      if (size < headerSize + 1) {
        pos++;
        continue;
      }

      const candidate =
        (header === 0xc1 && size === CONNECTION_INFO_LENGTH) || (header === 0xc3 && size === CHAT_INFO_WIRE_LENGTH);

      if (!candidate) {
        const available = data.length - pos;
        if (available >= size) {
          pos += size;
        } else {
          this.skip = size - available;
          pos = data.length;
        }
        continue;
      }

      if (data.length - pos < size) {
        hold = pos;
        break;
      }

      const frame = data.subarray(pos, pos + size);
      const replacement = header === 0xc1 ? this.connectionInfo(frame) : this.chatInfo(frame);
      if (replacement) {
        if (!owned) {
          data = data.slice();
          owned = true;
        }
        data.set(replacement, pos);
      }
      pos += size;
    }

    if (hold >= 0) {
      this.pending = data.slice(hold);
      return hold === 0 ? EMPTY : data.subarray(0, hold);
    }
    return data;
  }

  private connectionInfo(frame: Uint8Array): Uint8Array | null {
    if (frame[2] !== 0xf4 || frame[3] !== 0x03) return null;

    const ip = readString(frame, CONNECTION_INFO_IP, CONNECTION_INFO_IP_LENGTH);
    const port = frame[CONNECTION_INFO_PORT] | (frame[CONNECTION_INFO_PORT + 1] << 8);
    const alias = aliasFor(this.table, ip, port);

    const out = frame.slice();
    writeString(out, CONNECTION_INFO_IP, CONNECTION_INFO_IP_LENGTH, alias);
    out[CONNECTION_INFO_PORT] = 0;
    out[CONNECTION_INFO_PORT + 1] = 0;
    this.note({ kind: 'connection-info', from: `${ip}:${port}`, to: alias });
    return out;
  }

  private chatInfo(frame: Uint8Array): Uint8Array | null {
    const decryptor = new SimpleModulusDecryptor();
    decryptor.decryptionKeys = SimpleModulusKeys.CreateDecryptionKeys(SERVER_DECRYPTION_KEYS);

    let plain: Uint8Array;
    try {
      const [ok, decrypted] = decryptor.Decrypt(frame);
      if (!ok) return null;
      plain = decrypted;
    } catch {
      return null;
    }
    if (plain.length !== CHAT_INFO_LENGTH || plain[2] !== 0xca) return null;

    // Decrypt resynced to the frame's counter and then stepped past it.
    const counter = (decryptor.Counter.Count + 255) % 256;

    const ip = readString(plain, CHAT_INFO_IP, CHAT_INFO_IP_LENGTH);
    const alias = aliasFor(this.table, ip, this.chatPort);
    const edited = plain.slice();
    writeString(edited, CHAT_INFO_IP, CHAT_INFO_IP_LENGTH, alias);

    try {
      const encryptor = new SimpleModulusEncryptor();
      encryptor.encryptionKeys = SERVER_ENCRYPTION_KEYS;
      encryptor.Counter.Count = counter;
      const out = encryptor.Encrypt(edited);

      // The client must read back exactly what was meant, under the same counter.
      const check = new SimpleModulusDecryptor();
      check.decryptionKeys = SimpleModulusKeys.CreateDecryptionKeys(SERVER_DECRYPTION_KEYS);
      check.Counter.Count = counter;
      const [ok, back] = check.Decrypt(out.slice());
      if (out.length !== frame.length || !ok || check.lastError || !equal(back, edited)) {
        this.note({ kind: 'chat-info-failed' });
        return null;
      }

      this.note({ kind: 'chat-info', from: `${ip}:${this.chatPort}`, to: alias });
      return out;
    } catch {
      this.note({ kind: 'chat-info-failed' });
      return null;
    }
  }
}
