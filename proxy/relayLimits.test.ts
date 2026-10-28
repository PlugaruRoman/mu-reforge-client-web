import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRUSTED_PROXIES,
  IpSocketCounter,
  isTrustedProxy,
  parseTrustedProxies,
  relayLimitsFromEnv,
  resolveClientAddress,
  TokenBucket,
  upgradeHoldingSlot,
} from './relayLimits';

describe('relayLimitsFromEnv', () => {
  it('has safe defaults with no environment', () => {
    expect(relayLimitsFromEnv({})).toEqual({
      maxPayloadLength: 16 * 1024,
      backpressureLimit: 512 * 1024,
      idleTimeout: 120,
      tcpQueueLimit: 256 * 1024,
      preOpenLimit: 16 * 1024,
      connectTimeoutSeconds: 10,
      messageRate: 60,
      messageBurst: 200,
      byteRate: 32 * 1024,
      byteBurst: 256 * 1024,
      maxSocketsPerIp: 30,
      maxSocketsTotal: 2000,
    });
  });

  it('keeps the default worst case of all sockets inside the 3g container (compose.yml PROXY_MEM)', () => {
    const l = relayLimitsFromEnv({});
    const perSocket = l.backpressureLimit + l.tcpQueueLimit + l.preOpenLimit;
    expect(perSocket).toBe(784 * 1024);
    // 2000 x 784 KiB = 1.5 GiB of application buffers, leaving 1.5 GiB of the 3 GiB cap for the
    // kernel's socket buffers, Bun's heap and the runtime.
    expect(l.maxSocketsTotal * perSocket).toBeLessThanOrEqual(1.5 * 1024 ** 3);
  });

  it('reads overrides, ignores garbage and caps the idle timeout at what Bun allows', () => {
    const limits = relayLimitsFromEnv({ CLIENT_MSG_RATE: '50', MAX_SOCKETS_PER_IP: 'lots', WS_IDLE_TIMEOUT: '5000', TCP_QUEUE_LIMIT: '-1' });
    expect(limits.messageRate).toBe(50);
    expect(limits.maxSocketsPerIp).toBe(30);
    expect(limits.idleTimeout).toBe(960);
    expect(limits.tcpQueueLimit).toBe(256 * 1024);
  });

  it('turns the byte bucket and the total cap off with 0, and never lets the byte burst fall below one frame', () => {
    const off = relayLimitsFromEnv({ CLIENT_BYTE_RATE: '0', MAX_SOCKETS_TOTAL: '0' });
    expect(off.byteRate).toBe(0);
    expect(off.maxSocketsTotal).toBe(0);
    const small = relayLimitsFromEnv({ WS_MAX_PAYLOAD: '65536', CLIENT_BYTE_BURST: '1000' });
    expect(small.byteBurst).toBe(65536);
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

  it('counts bytes when given a cost, and a refused take costs nothing', () => {
    let now = 0;
    const bytes = new TokenBucket(32 * 1024, 256 * 1024, () => now);
    // The burst: 16 frames of 16 KiB at once.
    for (let i = 0; i < 16; i++) expect(bytes.take(16 * 1024)).toBe(true);
    expect(bytes.take(16 * 1024)).toBe(false);
    // A small packet still fits nowhere until the bucket refills...
    expect(bytes.take(1)).toBe(false);
    // ...and half a second at 32 KiB/s is exactly one 16 KiB frame.
    now += 500;
    expect(bytes.take(16 * 1024)).toBe(true);
    expect(bytes.take(1)).toBe(false);
  });

  it('lets a real client through: 60 packets of 60 bytes a second for ten minutes', () => {
    let now = 0;
    const frames = new TokenBucket(60, 200, () => now);
    const bytes = new TokenBucket(32 * 1024, 256 * 1024, () => now);
    let refused = 0;
    for (let i = 0; i < 60 * 600; i++) {
      now += 1000 / 60;
      if (!frames.take() || !bytes.take(60)) refused++;
    }
    expect(refused).toBe(0);
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
    expect(counter.total).toBe(0);
  });

  it('caps all addresses together, says which cap refused, and frees the total on release', () => {
    const counter = new IpSocketCounter(2, 3);
    expect(counter.tryAcquire('1.1.1.1')).toBeNull();
    expect(counter.tryAcquire('1.1.1.1')).toBeNull();
    expect(counter.tryAcquire('1.1.1.1')).toBe('ip');
    expect(counter.tryAcquire('2.2.2.2')).toBeNull();
    expect(counter.total).toBe(3);
    expect(counter.tryAcquire('3.3.3.3')).toBe('total');
    expect(counter.count('3.3.3.3')).toBe(0);
    counter.release('1.1.1.1');
    expect(counter.total).toBe(2);
    expect(counter.tryAcquire('3.3.3.3')).toBeNull();
  });

  it('ignores a release with nothing counted, so it never frees a slot of the total', () => {
    const counter = new IpSocketCounter(0, 1);
    counter.release('9.9.9.9');
    expect(counter.total).toBe(0);
    expect(counter.tryAcquire('1.1.1.1')).toBeNull();
    expect(counter.tryAcquire('2.2.2.2')).toBe('total');
  });
});

describe('upgradeHoldingSlot', () => {
  it('hands the slot on only when the upgrade happened', () => {
    const counter = new IpSocketCounter(5, 5);
    counter.tryAcquire('1.1.1.1');
    let undone = 0;
    expect(upgradeHoldingSlot(counter, '1.1.1.1', () => true, () => undone++)).toBe(true);
    expect(counter.count('1.1.1.1')).toBe(1);
    expect(undone).toBe(0);
  });

  it('gives the slot back and undoes when the upgrade fails', () => {
    const counter = new IpSocketCounter(5, 5);
    counter.tryAcquire('1.1.1.1');
    let undone = 0;
    expect(upgradeHoldingSlot(counter, '1.1.1.1', () => false, () => undone++)).toBe(false);
    expect(counter.count('1.1.1.1')).toBe(0);
    expect(counter.total).toBe(0);
    expect(undone).toBe(1);
  });

  it('gives the slot back when building the socket throws, and rethrows', () => {
    const counter = new IpSocketCounter(5, 5);
    counter.tryAcquire('1.1.1.1');
    expect(() =>
      upgradeHoldingSlot(counter, '1.1.1.1', () => {
        throw new Error('presence exploded');
      })
    ).toThrow('presence exploded');
    expect(counter.count('1.1.1.1')).toBe(0);
    expect(counter.total).toBe(0);
  });

  it('gives the slot back even when the undo throws', () => {
    const counter = new IpSocketCounter(5, 5);
    counter.tryAcquire('1.1.1.1');
    expect(() =>
      upgradeHoldingSlot(counter, '1.1.1.1', () => false, () => {
        throw new Error('tracker exploded');
      })
    ).toThrow('tracker exploded');
    expect(counter.total).toBe(0);
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
    expect(isTrustedProxy(docker, '203.0.113.7')).toBe(false);
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

  it('with the image default trusts only loopback and the pinned compose gateway', () => {
    // proxy.Dockerfile TRUSTED_PROXIES + compose.yml's subnet 172.31.250.0/24, gateway .1.
    const pinned = parseTrustedProxies('127.0.0.1,::1,172.31.250.1');
    // Host nginx, through the gateway: its X-Real-IP is the browser.
    expect(resolveClientAddress(pinned, { address: '172.31.250.1', port: 1 }, '203.0.113.7').ip).toBe('203.0.113.7');
    // The web container on the same network, or any other bridge, names only itself.
    expect(resolveClientAddress(pinned, { address: '172.31.250.2', port: 1 }, '203.0.113.7').ip).toBe('172.31.250.2');
    expect(resolveClientAddress(pinned, { address: '172.17.0.1', port: 1 }, '203.0.113.7').ip).toBe('172.17.0.1');
  });

  it('falls back to the peer when the header is missing or not an address', () => {
    expect(resolveClientAddress(loopback, { address: '127.0.0.1', port: 9 }, null)).toEqual({ ip: '127.0.0.1', port: 9 });
    expect(resolveClientAddress(loopback, { address: '127.0.0.1', port: 9 }, '203.0.113.7, 10.0.0.1').ip).toBe('127.0.0.1');
    expect(resolveClientAddress(loopback, { address: '127.0.0.1', port: 9 }, 'evil').ip).toBe('127.0.0.1');
    expect(resolveClientAddress(loopback, null, '203.0.113.7').ip).toBe('unknown');
  });
});
