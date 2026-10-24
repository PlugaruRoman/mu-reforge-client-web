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

    expect(KEYS.length).toBe(3525);
    expect(hashes).toEqual({
      en: '05415809f8ba4f76',
      bg: '743362ac9071fb30',
      zh: 'a3c02c6cba28c18d',
      fr: 'c3ce192657afcfb8',
      de: 'a326ea64b0cce05c',
      it: 'e47e3891b63b38ca',
      ja: 'ba61e765dc8f4b17',
      ko: 'c38ffae16b29285f',
      pl: 'fa2d99e354d28081',
      pt: '396cf318de5fd393',
      ro: 'ab1c03b11927e1d2',
      ru: 'da70834168957a48',
      es: '65fb92167374ba08',
      th: 'e798c26fdddf7a01',
      vi: '8b39f6df0da6b271',
      ar: 'c68dcde6ff061f0a',
      bn: '001f6d247a5565b9',
      ca: '41b0c61aaa45b63a',
      cs: '1ee6270e458657dc',
      el: '890a02f27e6913c6',
      eu: '3cbdfb567f0c43b8',
      fa: '973cfcb1aadff7c7',
      fil: '0c9f589cd6a507d3',
      hi: '688cae19118526be',
      hu: 'd33799936a198b7d',
      id: 'edb36e606bbcf8f9',
      'sr-Latn': '7efcc098fc32f8aa',
      tr: 'b42b8e50a0e32c60',
      uk: '2f8968301ef68a95',
      ur: '9b80b40896dd8f35',
      'zh-Hant': '4fe02d409691d89b',
    });
  });
});
