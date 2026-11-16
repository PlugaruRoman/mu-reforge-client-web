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

    expect(KEYS.length).toBe(3731);
    expect(hashes).toEqual({
      en: '2374f72f55a7cc8c',
      bg: 'a4b5ec17cfa4a80c',
      zh: 'bafd33aec22f68f5',
      fr: '1bc9fad9a5f7071c',
      de: '844bbb2d68699d27',
      it: '1e12d7ea41f07da7',
      ja: '3d85c821bbacff65',
      ko: '63adf9bc87a8717c',
      pl: 'ca57052faeb2d63e',
      pt: '4c0ac60ca2af9091',
      ro: 'c4020d9dee556bc9',
      ru: '066d8de08af74921',
      es: '7544dcaaeddd621a',
      th: 'b6213ff9922981fc',
      vi: '55e1ce50f786b602',
      ar: 'bcb5ac8082961143',
      bn: '408b5b0f478f9c55',
      ca: 'e6839a7c6c456c38',
      cs: 'a7c69287a30af9f4',
      el: '29c6765d7bde1b14',
      eu: 'b61795747b38b5ca',
      fa: '5a9076ddea40df81',
      fil: 'be38cb03c6d6210a',
      hi: '4ab2f78c34caf6dc',
      hu: '4a41861bf3008588',
      id: '9a4968ea5be5a281',
      'sr-Latn': 'f9c3a63831c62ea2',
      tr: 'ed0bc75c0f947b82',
      uk: '9f0ae1c4fcb3bc2a',
      ur: 'd1aaec2013be7316',
      'zh-Hant': 'a7d237aa6799a8aa',
    });
  });
});
