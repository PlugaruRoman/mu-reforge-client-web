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

    expect(KEYS.length).toBe(3718);
    expect(hashes).toEqual({
      en: '117286aa41b0bbd3',
      bg: '2d5f9220f545717a',
      zh: '3a4754cc4f7e6a3e',
      fr: '4af698127c4cfe1d',
      de: '2ed3e6ac193d11d1',
      it: 'ad405b8066abef6d',
      ja: '9170977da6c0a6af',
      ko: 'ffca80c3099cf32c',
      pl: '64e1ca3345e3a6a5',
      pt: '81fc1dbde7e0492c',
      ro: 'd164f413f28790bd',
      ru: 'a5e1d8cb39e14349',
      es: '21ff042340cf59fc',
      th: 'b31e73307f4a3cdd',
      vi: 'e71e87b62be4d7cb',
      ar: 'eea5853ff86fa000',
      bn: '0718a96f5bf72b04',
      ca: 'c192ee4b645677d0',
      cs: '06851c6b1982cea3',
      el: '70e8cc66ffb81e8c',
      eu: '01eb604a128140cc',
      fa: 'b0405f267dc30ec0',
      fil: 'd8c2751f74e2ed4e',
      hi: '3e8451ef5158e526',
      hu: 'c796ac44440af033',
      id: '7ee16ac7d6528a73',
      'sr-Latn': '88986e3ee319891a',
      tr: '7f4a74ebebfc74c4',
      uk: '481226284ef6229f',
      ur: '0855839c478f8f81',
      'zh-Hant': '5f685492e10d0237',
    });
  });
});
