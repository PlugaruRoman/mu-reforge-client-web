import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { EN_TEXT, i18n, t, type TextKey } from './index';

/**
 * Pins what `t(key)` returns for every key in every language, switching the
 * language through the engine, plus each language's selector metadata. Moving
 * text between files must leave every hash as it is.
 */

const KEYS = (Object.keys(EN_TEXT) as TextKey[]).sort();

function languageHash(code: string): string {
  i18n.setLanguage(code);
  expect(i18n.language).toBe(code);

  const layer = i18n.current;
  const pack = layer.dataPack;
  const hash = createHash('sha256');
  hash.update(
    JSON.stringify([
      layer.name, layer.code, layer.aliases ?? [], layer.label, layer.region, layer.font ?? '',
      pack ? [pack.folder, pack.suffix, pack.encoding ?? '', !!pack.repairs, !!pack.itemNames, !!pack.dialogPages] : null,
    ])
  );
  for (const key of KEYS) hash.update(`${key}\t${t(key)}\t${i18n.translated(key)}\n`);
  return hash.digest('hex').slice(0, 16);
}

describe('text golden', () => {
  it('every key reads the same line in every language', () => {
    const was = i18n.language;
    const hashes = Object.fromEntries(i18n.languages.map(l => [l.code, languageHash(l.code)]));
    i18n.setLanguage(was);

    expect(KEYS.length).toBe(3770);
    expect(hashes).toEqual({
      en: '71bf93d833ba8de6',
      bg: '17c74fdd3caabd70',
      zh: '220be3ae7e1730f9',
      fr: '07dad62a563a09cd',
      de: '2788cdec9b6480e3',
      it: 'befa3bd8afaae780',
      ja: '879cb1e070624c2f',
      ko: '5765658e82fd889d',
      pl: '806cda3d21b07a71',
      pt: '838248426b62c4f5',
      ro: 'db3f9e75712ee18a',
      ru: '60fac0da562ca5a4',
      es: 'ca5ba99d922120c8',
      th: 'b76fbaf914d88d7c',
      vi: 'ecefd001f234413b',
      ar: 'b680fba4878b6d73',
      bn: '02b1143c10a0033c',
      ca: '64c73f4875d94482',
      cs: 'b7e08b7e8d37f60b',
      el: '0192922569c73663',
      eu: '20d8b8f976d09868',
      fa: '48fcef48823bc400',
      fil: 'e7996fb0412b8edb',
      hi: '0a631283f03e2d80',
      hu: '9189689c7e718269',
      id: '26e1579773b64c35',
      'sr-Latn': '04bc0258f0d2b582',
      tr: '5c4b9936575feebe',
      uk: 'e82cfa052c78a099',
      ur: '43852d86574d715c',
      'zh-Hant': '6d736855331eb225',
    });
  });
});
