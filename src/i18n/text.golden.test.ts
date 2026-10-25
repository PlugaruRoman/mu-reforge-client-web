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

    expect(KEYS.length).toBe(3527);
    expect(hashes).toEqual({
      en: '898c1c2ff85522ec',
      bg: 'e532b09b86abc8f4',
      zh: 'd85da29baf27d5d3',
      fr: '56bef4e14def3b04',
      de: '4da3a4d7ded58e70',
      it: 'd9e0ecc3ba9c865a',
      ja: 'cd86363899714fff',
      ko: '47adcbe0211e1474',
      pl: '4e98639f4db60ea3',
      pt: '1ca7bcf6fc85e0d6',
      ro: 'c9eb942263a83a2a',
      ru: 'd0a9f76aab40c0e0',
      es: '2c8e42b68c0a0d20',
      th: '47096ba86ac7c84a',
      vi: '5f08065ba58ecb38',
      ar: '51d1ffb6014157de',
      bn: '234a3dd50800cfd8',
      ca: 'ff0fe8cfc08b89cc',
      cs: '08e6ccec0a496131',
      el: 'b4df8327cb32b03c',
      eu: 'a3583d45e2e5bdd2',
      fa: '9e946db03912638d',
      fil: 'dcfdba3781bacb3d',
      hi: '648cd8659c35a538',
      hu: 'ac218bee78b56a69',
      id: 'c59068812beece61',
      'sr-Latn': 'f33781f1840e7892',
      tr: '90b59ab39ab56fcf',
      uk: 'ae83fa0516fd5bac',
      ur: '4e5876ea81407219',
      'zh-Hant': '4c7dc902e87067d4',
    });
  });
});
