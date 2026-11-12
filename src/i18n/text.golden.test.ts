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

    expect(KEYS.length).toBe(3720);
    expect(hashes).toEqual({
      en: 'a0569f2214acfbe4',
      bg: '32200be30d0cfb41',
      zh: '728470d44ae026ac',
      fr: '98889ac6fd26c821',
      de: '0845cde0a69b69c4',
      it: '267d9f0712ea8476',
      ja: '510d34f9ceb2dfc7',
      ko: 'fc510351cd4372c7',
      pl: 'ad53526195d96944',
      pt: 'acea427ca09f98da',
      ro: '506d7f717bffd4af',
      ru: 'b9206e934acb3f79',
      es: '26ab88c8d6b47f99',
      th: '787eddb505777293',
      vi: 'fe465466a7d849c9',
      ar: 'ab7051b6d4315028',
      bn: 'c52cebbb53f32e01',
      ca: 'c738811ddc2c334f',
      cs: '54e31d9ef607099b',
      el: 'a25d7cb490f66428',
      eu: '15684df3f4cc7009',
      fa: '829ed4f6b2f22f49',
      fil: '8152c9c66387e54d',
      hi: 'ac2f508dc6ad8ebf',
      hu: 'e2b408a6ad8263fa',
      id: '0fe2da81ef4cce78',
      'sr-Latn': '53509e1f311f5fde',
      tr: '818e71e727ca4efd',
      uk: '921b94b2ef33344f',
      ur: 'cc74e302e3a24d34',
      'zh-Hant': '0ad9329127bff0fc',
    });
  });
});
