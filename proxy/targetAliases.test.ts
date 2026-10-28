import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aliasFor, proxyTargetsFromEnv, requestTarget, UNLISTED_ALIAS, type AliasTable } from './targetAliases';

const ENV = 'cs=169.58.146.212:44406, molten-1=169.58.146.212:55901,chat=169.58.146.212:55980';

function table(raw = ENV): AliasTable {
  const parsed = proxyTargetsFromEnv(raw);
  if ('error' in parsed || !parsed.table) throw new Error(JSON.stringify(parsed));
  return parsed.table;
}

const query = (q: string) => new URLSearchParams(q);

describe('proxyTargetsFromEnv', () => {
  it('is off when unset', () => {
    expect(proxyTargetsFromEnv(undefined)).toEqual({ table: null });
  });

  it('parses alias=host:port entries', () => {
    const t = table();
    expect(t.byAlias.get('molten-1')).toEqual({ alias: 'molten-1', host: '169.58.146.212', port: 55901 });
    expect(t.byAddress.get('169.58.146.212:44406')).toBe('cs');
    expect(t.byAlias.size).toBe(3);
  });

  it('refuses to start on anything it cannot read (fail closed)', () => {
    for (const raw of [
      '',
      ' , ',
      'cs=169.58.146.212',
      'cs=169.58.146.212:0',
      'cs=169.58.146.212:70000',
      '169.58.146.212:44406',
      'cs=1.2.3.4:1,cs=1.2.3.4:2',
      'cs=1.2.3.4:1,gs=1.2.3.4:1',
      'molten-1=1.2.3.4:CHANGEME_PORT',
      '1cs=1.2.3.4:1',
      'a.b=1.2.3.4:1',
      'abcdefghijklmnop=1.2.3.4:1',
      `${UNLISTED_ALIAS}=1.2.3.4:1`,
    ]) {
      expect('error' in proxyTargetsFromEnv(raw), raw).toBe(true);
    }
  });
});

describe('requestTarget', () => {
  it('resolves ?target= and ?host= to the configured address, ignoring the port', () => {
    const t = table();
    expect(requestTarget(query('target=cs'), t)).toEqual({ ok: true, host: '169.58.146.212', port: 44406, label: 'cs' });
    expect(requestTarget(query('host=Molten-1&port=0'), t)).toMatchObject({ ok: true, port: 55901, label: 'molten-1' });
    expect(requestTarget(query('host=chat&port=55980'), t)).toMatchObject({ ok: true, port: 55980, label: 'chat' });
  });

  it('refuses raw addresses and unknown names when aliases are configured', () => {
    const t = table();
    for (const q of [
      'host=169.58.146.212&port=44406',
      'host=play.mureforge.com&port=44406',
      'host=127.0.0.1&port=3001',
      `host=${UNLISTED_ALIAS}&port=0`,
      'target=nope',
    ]) {
      expect(requestTarget(query(q), t), q).toMatchObject({ ok: false, status: 403 });
    }
    expect(requestTarget(query(''), t)).toMatchObject({ ok: false, status: 400 });
  });

  it('keeps the upstream host+port form without aliases', () => {
    expect(requestTarget(query('host=Play.Example.com&port=44405'), null)).toEqual({
      ok: true,
      host: 'play.example.com',
      port: 44405,
      label: 'play.example.com:44405',
    });
    expect(requestTarget(query('host=cs&port=0'), null)).toMatchObject({ ok: false, status: 400 });
    expect(requestTarget(query('target=cs'), null)).toMatchObject({ ok: false, status: 400 });
  });

  it('never logs the raw text of a hostile name', () => {
    const r = requestTarget(query(`target=${encodeURIComponent('x\n<script>'.repeat(10))}`), table());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.log).not.toContain('\n');
      expect((r.log ?? '').length).toBeLessThan(100);
    }
  });
});

describe('aliasFor', () => {
  it('names a known address and hides an unknown one', () => {
    const t = table();
    expect(aliasFor(t, '169.58.146.212', 55901)).toBe('molten-1');
    expect(aliasFor(t, '169.58.146.212', 55902)).toBe(UNLISTED_ALIAS);
    expect(aliasFor(t, '10.0.0.1', 55901)).toBe(UNLISTED_ALIAS);
  });
});

describe('deploy/reforge/proxy.env.example', () => {
  const line = readFileSync('deploy/reforge/proxy.env.example', 'utf8')
    .split(/\r?\n/)
    .find(l => l.startsWith('PROXY_TARGETS='));
  const raw = (line ?? '').slice('PROXY_TARGETS='.length);

  it('refuses to start as shipped (CHANGEME), and parses once the ports are filled in', () => {
    expect(proxyTargetsFromEnv(raw)).toMatchObject({ error: expect.stringMatching(/CHANGEME/) });

    let port = 56000;
    const filled = raw.replace(/CHANGEME_[A-Z0-9_]+/g, () => String(port++));
    const t = table(filled);
    expect([...t.byAlias.keys()]).toEqual(
      expect.arrayContaining(['cs', 'molten-1', 'inferno-1', 'chat', 'chat-inferno'])
    );
    expect(t.byAlias.get('cs')).toMatchObject({ port: 44406 });
  });
});
