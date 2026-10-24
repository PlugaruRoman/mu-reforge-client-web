import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRUSTED_PROXIES,
  IpSocketCounter,
  isTrustedProxy,
  parseTrustedProxies,
  relayLimitsFromEnv,
  resolveClientAddress,
  TokenBucket,
} from './relayLimits';

describe('relayLimitsFromEnv', () => {
  it('has safe defaults with no environment', () => {
    expect(relayLimitsFromEnv({})).toEqual({
      maxPayloadLength: 65536,
      backpressureLimit: 1024 * 1024,
      idleTimeout: 120,
      tcpQueueLimit: 1024 * 1024,
      preOpenLimit: 64 * 1024,
      connectTimeoutSeconds: 10,
      messageRate: 100,
      messageBurst: 200,
      maxSocketsPerIp: 50,
    });
  });

  it('reads overrides, ignores garbage and caps the idle timeout at what Bun allows', () => {
    const limits = relayLimitsFromEnv({ CLIENT_MSG_RATE: '50', MAX_SOCKETS_PER_IP: 'lots', WS_IDLE_TIMEOUT: '5000', TCP_QUEUE_LIMIT: '-1' });
    expect(limits.messageRate).toBe(50);
    expect(limits.maxSocketsPerIp).toBe(50);
    expect(limits.idleTimeout).toBe(960);
    expect(limits.tcpQueueLimit).toBe(1024 * 1024);
  });
});

describe('TokenBucket', () => {
  it('allows the burst at once, then the rate', () => {
    let now = 0;
    const bucket = new TokenBucket(100, 200, () => now);
    for (let i = 0; i < 200; i++) expect(bucket.take()).toBe(true);
    expect(bucket.take()).toBe(false);

    now += 100; // 0.1 s at 100/s = 10 frames
    for (let i = 0; i < 10; i++) expect(bucket.take()).toBe(true);
    expect(bucket.take()).toBe(false);
  });

  it('lets a steady client at the rate through forever', () => {
    let now = 0;
    const bucket = new TokenBucket(100, 200, () => now);
    for (let i = 0; i < 10_000; i++) {
      now += 10;
      expect(bucket.take()).toBe(true);
    }
  });

  it('never refills past the burst', () => {
    let now = 0;
    const bucket = new TokenBucket(100, 5, () => now);
    now += 60_000;
    for (let i = 0; i < 5; i++) expect(bucket.take()).toBe(true);
    expect(bucket.take()).toBe(false);
  });

  it('is off with a rate of 0', () => {
    const bucket = new TokenBucket(0, 0, () => 0);
    for (let i = 0; i < 1000; i++) expect(bucket.take()).toBe(true);
  });
});

describe('IpSocketCounter', () => {
  it('caps concurrent sockets per address and frees a slot on release', () => {
    const counter = new IpSocketCounter(2);
    expect(counter.acquire('1.1.1.1')).toBe(true);
    expect(counter.acquire('1.1.1.1')).toBe(true);
    expect(counter.acquire('1.1.1.1')).toBe(false);
    expect(counter.acquire('2.2.2.2')).toBe(true);
    counter.release('1.1.1.1');
    expect(counter.acquire('1.1.1.1')).toBe(true);
    expect(counter.count('1.1.1.1')).toBe(2);
  });

  it('forgets an address with nothing open, and 0 means no cap', () => {
    const counter = new IpSocketCounter(0);
    for (let i = 0; i < 100; i++) expect(counter.acquire('1.1.1.1')).toBe(true);
    for (let i = 0; i < 101; i++) counter.release('1.1.1.1');
    expect(counter.count('1.1.1.1')).toBe(0);
  });
});

describe('client address', () => {
  const loopback = parseTrustedProxies(DEFAULT_TRUSTED_PROXIES);
  const docker = parseTrustedProxies('127.0.0.1,::1,172.16.0.0/12');

  it('parses addresses and CIDR ranges, and refuses a typo', () => {
    expect(isTrustedProxy(docker, '172.17.0.1')).toBe(true);
    expect(isTrustedProxy(docker, '172.31.255.254')).toBe(true);
    expect(isTrustedProxy(docker, '172.32.0.1')).toBe(false);
    expect(isTrustedProxy(docker, '::1')).toBe(true);
    expect(isTrustedProxy(docker, '84.247.161.247')).toBe(false);
    expect(() => parseTrustedProxies('127.0.0.1,nginx')).toThrow();
    expect(() => parseTrustedProxies('10.0.0.0/33')).toThrow();
    expect(parseTrustedProxies(' , ')).toEqual([]);
  });

  it('believes X-Real-IP only from a trusted peer', () => {
    expect(resolveClientAddress(loopback, { address: '127.0.0.1', port: 40000 }, '203.0.113.7')).toEqual({ ip: '203.0.113.7', port: 0 });
    expect(resolveClientAddress(loopback, { address: '::ffff:127.0.0.1', port: 40000 }, '203.0.113.7').ip).toBe('203.0.113.7');
    // A browser reaching Bun directly cannot name itself someone else.
    expect(resolveClientAddress(loopback, { address: '198.51.100.9', port: 5555 }, '203.0.113.7')).toEqual({ ip: '198.51.100.9', port: 5555 });
    // Nginx in front, seen from the container through the docker gateway.
    expect(resolveClientAddress(loopback, { address: '172.18.0.1', port: 1 }, '203.0.113.7').ip).toBe('172.18.0.1');
    expect(resolveClientAddress(docker, { address: '172.18.0.1', port: 1 }, '203.0.113.7').ip).toBe('203.0.113.7');
  });

  it('falls back to the peer when the header is missing or not an address', () => {
    expect(resolveClientAddress(loopback, { address: '127.0.0.1', port: 9 }, null)).toEqual({ ip: '127.0.0.1', port: 9 });
    expect(resolveClientAddress(loopback, { address: '127.0.0.1', port: 9 }, '203.0.113.7, 10.0.0.1').ip).toBe('127.0.0.1');
    expect(resolveClientAddress(loopback, { address: '127.0.0.1', port: 9 }, 'evil').ip).toBe('127.0.0.1');
    expect(resolveClientAddress(loopback, null, '203.0.113.7').ip).toBe('unknown');
  });
});
