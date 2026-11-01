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

    expect(KEYS.length).toBe(3708);
    expect(hashes).toEqual({
      en: 'd43014b47a010493',
      bg: 'dfe7a40a65a10825',
      zh: 'fa77a234ad4d7fea',
      fr: 'd05f7dde9b28b662',
      de: 'dc7d89e2845e3cce',
      it: 'df6d2c4a010a8a9f',
      ja: '47ddec42e46dbbb5',
      ko: '11c03d995ff221b1',
      pl: 'b406cc6aa304e69a',
      pt: '021012b195ac8626',
      ro: 'b69603e0c82597a6',
      ru: '4676b300ee82e171',
      es: '45200cfa6a2dec03',
      th: '077d644e82fef0cc',
      vi: 'be215bb3452c9580',
      ar: '3f7121957518be63',
      bn: '8f971b64b2ea1e16',
      ca: '1ca134f96c7e15b4',
      cs: '5fa3ae410e8e9e72',
      el: '689d4a0cd82079f4',
      eu: '3b4213f907290098',
      fa: 'd4163ded1a0c481f',
      fil: '75b187b9d1e5ee25',
      hi: '39dd4b7f88391878',
      hu: 'c2c5ed2cd25d08a1',
      id: 'b608cde1e9ef2ca9',
      'sr-Latn': 'da72a15edd1a8c39',
      tr: '551016def9a0884b',
      uk: '4789e65d471ea354',
      ur: 'ac180d7f1ec3c3f7',
      'zh-Hant': '101eb725365b62d8',
    });
  });
});
