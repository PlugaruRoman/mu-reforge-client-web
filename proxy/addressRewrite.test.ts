import { describe, expect, it } from 'vitest';
import {
  SimpleModulusDecryptor,
  SimpleModulusEncryptor,
  SimpleModulusKeys,
} from '../src/controllers/net/encryption/simpleModulus';
import { gameVersion } from '../versions/season6';
import { AddressRewriter, type RewriteNote } from './addressRewrite';
import { proxyTargetsFromEnv, UNLISTED_ALIAS, type AliasTable } from './targetAliases';

const parsed = proxyTargetsFromEnv(
  'cs=169.58.146.212:44406,molten-1=169.58.146.212:55901,inferno-1=169.58.207.145:55919,chat=169.58.146.212:55980'
);
if ('error' in parsed || !parsed.table) throw new Error('bad test table');
const TABLE: AliasTable = parsed.table;

const CHAT_PORT = 55980;

function connectionInfo(ip: string, port: number): Uint8Array {
  const p = new Uint8Array(22);
  p.set([0xc1, 22, 0xf4, 0x03]);
  for (let i = 0; i < ip.length; i++) p[4 + i] = ip.charCodeAt(i);
  p[20] = port & 0xff;
  p[21] = port >> 8;
  return p;
}

function readIp(bytes: Uint8Array, from: number, length: number): string {
  let s = '';
  for (let i = from; i < from + length && bytes[i]; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/** ChatRoomConnectionInfo as the game server sends it: plain 36 bytes, encrypted under `counter`. */
function chatInfoPlain(ip: string): Uint8Array {
  const p = new Uint8Array(36);
  p.set([0xc3, 36, 0xca]);
  for (let i = 0; i < ip.length; i++) p[3 + i] = ip.charCodeAt(i);
  p[18] = 7; // room id
  p.set([0x78, 0x56, 0x34, 0x12], 20); // token
  p[24] = 1;
  p.set([0x4b, 0x6e, 0x69, 0x67, 0x68, 0x74], 25); // "Knight"
  p[35] = 1;
  return p;
}

function serverEncrypt(plain: Uint8Array, counter: number): Uint8Array {
  const enc = new SimpleModulusEncryptor();
  enc.encryptionKeys = SimpleModulusEncryptor.DefaultServerKey;
  enc.Counter.Count = counter;
  return enc.Encrypt(plain.slice());
}

/** The browser's side: its own decryptor, expecting `counter`. */
function clientDecrypt(wire: Uint8Array, counter: number): { plain: Uint8Array; error: string | null } {
  const dec = new SimpleModulusDecryptor();
  dec.decryptionKeys = SimpleModulusKeys.CreateDecryptionKeys([...gameVersion.protocol.encryption.serverToClient]);
  dec.Counter.Count = counter;
  const [ok, plain] = dec.Decrypt(wire.slice());
  if (!ok) throw new Error('client could not decrypt');
  return { plain, error: dec.lastError };
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Feeds `stream` cut at `cuts`, returns everything forwarded. */
function run(rewriter: AddressRewriter, stream: Uint8Array, cuts: number[]): Uint8Array {
  const out: Uint8Array[] = [];
  let from = 0;
  for (const cut of [...cuts, stream.length]) {
    out.push(rewriter.feed(stream.slice(from, cut)));
    from = cut;
  }
  return concat(...out);
}

const otherC1 = new Uint8Array([0xc1, 0x05, 0xf4, 0x06, 0x00]);
const bigC2 = (() => {
  const p = new Uint8Array(300);
  p.set([0xc2, 0x01, 0x2c, 0xf4, 0x06]);
  // An embedded "C1 16 F4 03" that is payload, not a frame: must not be touched.
  p.set(connectionInfo('169.58.146.212', 55901), 40);
  return p;
})();

describe('AddressRewriter: ConnectionInfo (C1 F4 03)', () => {
  it('replaces the IP with the alias and the port with 0, same length', () => {
    const notes: RewriteNote[] = [];
    const r = new AddressRewriter(TABLE, CHAT_PORT, n => notes.push(n));
    const out = r.feed(connectionInfo('169.58.146.212', 55901));
    expect(out.length).toBe(22);
    expect(readIp(out, 4, 16)).toBe('molten-1');
    expect(out.subarray(4 + 8, 20).every(b => b === 0)).toBe(true);
    expect(out[20] | (out[21] << 8)).toBe(0);
    expect(notes).toEqual([{ kind: 'connection-info', from: '169.58.146.212:55901', to: 'molten-1' }]);
  });

  it('names the other realm too, and hides an address it does not know', () => {
    const r = new AddressRewriter(TABLE, CHAT_PORT);
    expect(readIp(r.feed(connectionInfo('169.58.207.145', 55919)), 4, 16)).toBe('inferno-1');
    const unknown = r.feed(connectionInfo('169.58.146.212', 55999));
    expect(readIp(unknown, 4, 16)).toBe(UNLISTED_ALIAS);
    expect(Array.from(unknown).join(',')).not.toContain('49,54,57'); // no "169" left
  });

  it('never mutates the chunk it was given', () => {
    const r = new AddressRewriter(TABLE, CHAT_PORT);
    const chunk = connectionInfo('169.58.146.212', 55901);
    const before = chunk.slice();
    r.feed(chunk);
    expect(chunk).toEqual(before);
  });

  it('passes an untouched stream through as the same array', () => {
    const r = new AddressRewriter(TABLE, CHAT_PORT);
    const chunk = concat(otherC1, bigC2);
    expect(r.feed(chunk)).toBe(chunk);
  });

  it('rewrites a frame split at every possible point, with frames around it', () => {
    const info = connectionInfo('169.58.146.212', 44406);
    const stream = concat(otherC1, bigC2, info, otherC1);
    const expected = concat(otherC1, bigC2, connectionInfo('cs', 0), otherC1);

    for (let cut = 1; cut < stream.length; cut++) {
      const r = new AddressRewriter(TABLE, CHAT_PORT);
      expect(run(r, stream, [cut]), `cut ${cut}`).toEqual(expected);
      expect(r.heldBytes).toBe(0);
    }
    // One byte at a time.
    const r = new AddressRewriter(TABLE, CHAT_PORT);
    expect(run(r, stream, Array.from({ length: stream.length - 1 }, (_, i) => i + 1))).toEqual(expected);
  });

  it('rewrites several coalesced into one read', () => {
    const r = new AddressRewriter(TABLE, CHAT_PORT);
    const out = r.feed(concat(connectionInfo('169.58.146.212', 55901), otherC1, connectionInfo('169.58.207.145', 55919)));
    expect(readIp(out, 4, 16)).toBe('molten-1');
    expect(readIp(out, 22 + 5 + 4, 16)).toBe('inferno-1');
  });

  it('leaves other C1 frames of the same length alone', () => {
    const r = new AddressRewriter(TABLE, CHAT_PORT);
    const frame = connectionInfo('169.58.146.212', 55901);
    frame[3] = 0x05;
    expect(r.feed(frame)).toBe(frame);
  });
});

describe('AddressRewriter: ChatRoomConnectionInfo (C3 CA)', () => {
  it('re-encrypts with the alias under the original counter', () => {
    const notes: RewriteNote[] = [];
    const r = new AddressRewriter(TABLE, CHAT_PORT, n => notes.push(n));
    for (const counter of [0, 7, 255]) {
      const wire = serverEncrypt(chatInfoPlain('169.58.146.212'), counter);
      const out = r.feed(wire);
      expect(out.length).toBe(wire.length);

      const { plain, error } = clientDecrypt(out, counter);
      expect(error).toBeNull(); // the client's counter stays in step
      expect(readIp(plain, 3, 15)).toBe('chat');
      // Everything but the address is what the server sent.
      const expected = chatInfoPlain('chat');
      expect(plain).toEqual(expected);
    }
    expect(notes.at(-1)).toEqual({ kind: 'chat-info', from: '169.58.146.212:55980', to: 'chat' });
  });

  it('hides a chat server it does not know', () => {
    const r = new AddressRewriter(TABLE, CHAT_PORT);
    const out = r.feed(serverEncrypt(chatInfoPlain('169.58.207.145'), 3));
    expect(readIp(clientDecrypt(out, 3).plain, 3, 15)).toBe(UNLISTED_ALIAS);
  });

  it('rewrites one split across reads, between other frames', () => {
    const wire = serverEncrypt(chatInfoPlain('169.58.146.212'), 12);
    const stream = concat(bigC2, wire, otherC1);
    for (const cut of [1, 299, 300, 301, 302, 330, stream.length - 6, stream.length - 1]) {
      const r = new AddressRewriter(TABLE, CHAT_PORT);
      const out = run(r, stream, [cut]);
      expect(out.length, `cut ${cut}`).toBe(stream.length);
      expect(out.subarray(0, 300)).toEqual(bigC2);
      expect(readIp(clientDecrypt(out.subarray(300, 300 + wire.length), 12).plain, 3, 15)).toBe('chat');
      expect(out.subarray(300 + wire.length)).toEqual(otherC1);
    }
  });

  it('passes other C3 frames of the same wire length through', () => {
    const r = new AddressRewriter(TABLE, CHAT_PORT);
    const plain = chatInfoPlain('169.58.146.212');
    plain[2] = 0xcb;
    const wire = serverEncrypt(plain, 1);
    expect(r.feed(wire)).toBe(wire);
  });
});
