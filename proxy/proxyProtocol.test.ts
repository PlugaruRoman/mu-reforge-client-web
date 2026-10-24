import { describe, expect, it } from 'vitest';
import { parseIp, PROXY_V2_SIGNATURE, proxyProtocolFromEnv, proxyV2Header } from './proxyProtocol';

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(' ');

function ip(text: string): Uint8Array {
  const bytes = parseIp(text);
  if (!bytes) throw new Error(`not parsed: ${text}`);
  return bytes;
}

describe('parseIp', () => {
  it('reads IPv4 and IPv6 literals, compressed, bracketed and v4-mapped', () => {
    expect(Array.from(ip('84.247.161.247'))).toEqual([84, 247, 161, 247]);
    expect(ip('::1').length).toBe(16);
    expect(ip('::1')[15]).toBe(1);
    expect(hex(ip('[2001:db8::ff00:42:8329]'))).toBe('20 01 0d b8 00 00 00 00 00 00 ff 00 00 42 83 29');
    expect(hex(ip('::ffff:1.2.3.4'))).toBe('00 00 00 00 00 00 00 00 00 00 ff ff 01 02 03 04');
  });

  it('refuses anything that is not an address', () => {
    for (const bad of ['', 'play.mureforge.com', '1.2.3', '1.2.3.256', '1.2.3.4.5', '1::2::3', 'fe80::1%eth0', '1:2:3:4:5:6:7:8:9', 'g::1']) {
      expect(parseIp(bad), bad).toBeNull();
    }
  });
});

describe('proxyV2Header', () => {
  it('writes the spec signature, PROXY command and TCP4 addresses', () => {
    const header = proxyV2Header({ ip: '203.0.113.7', port: 51234 }, { ip: '169.58.146.212', port: 55902 });

    // \r\n\r\n\0\r\nQUIT\n
    expect(hex(header.subarray(0, 12))).toBe('0d 0a 0d 0a 00 0d 0a 51 55 49 54 0a');
    expect(new TextDecoder().decode(header.subarray(7, 11))).toBe('QUIT');
    expect(header[12]).toBe(0x21); // version 2, PROXY
    expect(header[13]).toBe(0x11); // AF_INET, STREAM
    expect((header[14] << 8) | header[15]).toBe(12);
    expect(header.length).toBe(16 + 12);
    expect(Array.from(header.subarray(16, 20))).toEqual([203, 0, 113, 7]); // source
    expect(Array.from(header.subarray(20, 24))).toEqual([169, 58, 146, 212]); // destination
    expect((header[24] << 8) | header[25]).toBe(51234); // source port
    expect((header[26] << 8) | header[27]).toBe(55902); // destination port
  });

  it('writes TCP6 with 36 address bytes', () => {
    const header = proxyV2Header({ ip: '2001:db8::1', port: 1 }, { ip: '2001:db8::2', port: 44406 });
    expect(header.subarray(0, 12)).toEqual(PROXY_V2_SIGNATURE);
    expect(header[12]).toBe(0x21);
    expect(header[13]).toBe(0x21); // AF_INET6, STREAM
    expect((header[14] << 8) | header[15]).toBe(36);
    expect(header.length).toBe(16 + 36);
    expect(header[16]).toBe(0x20);
    expect(header[31]).toBe(1);
    expect(header[47]).toBe(2);
    expect((header[48] << 8) | header[49]).toBe(1);
    expect((header[50] << 8) | header[51]).toBe(44406);
  });

  it('sends a v4-mapped address as IPv4, and maps IPv4 into IPv6 when the families differ', () => {
    expect(proxyV2Header({ ip: '::ffff:10.0.0.9', port: 0 }, { ip: '127.0.0.1', port: 55901 })[13]).toBe(0x11);

    const mixed = proxyV2Header({ ip: '1.2.3.4', port: 0 }, { ip: '2001:db8::2', port: 55901 });
    expect(mixed[13]).toBe(0x21);
    expect(hex(mixed.subarray(16, 32))).toBe('00 00 00 00 00 00 00 00 00 00 ff ff 01 02 03 04');
  });

  it('refuses a host name, which the spec has no field for', () => {
    expect(() => proxyV2Header({ ip: 'unknown', port: 0 }, { ip: '127.0.0.1', port: 1 })).toThrow();
    expect(() => proxyV2Header({ ip: '1.2.3.4', port: 0 }, { ip: 'play.mureforge.com', port: 1 })).toThrow();
  });
});

describe('PROXY_PROTOCOL', () => {
  it('is off unless set to v2, and refuses anything else', () => {
    expect(proxyProtocolFromEnv(undefined)).toBe('off');
    expect(proxyProtocolFromEnv('')).toBe('off');
    expect(proxyProtocolFromEnv('off')).toBe('off');
    expect(proxyProtocolFromEnv(' V2 ')).toBe('v2');
    expect(() => proxyProtocolFromEnv('v1')).toThrow();
    expect(() => proxyProtocolFromEnv('on')).toThrow();
  });
});
