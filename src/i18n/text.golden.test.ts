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

    expect(KEYS.length).toBe(3542);
    expect(hashes).toEqual({
      en: 'a9ad24cecbcbb183',
      bg: '6b68ee6bcf53f716',
      zh: 'b1da6278a4c6e069',
      fr: '25027272f8d16cf5',
      de: '6569de052eeb2686',
      it: '478426cfe55b332b',
      ja: '236579a0d4b84e1d',
      ko: '3410b23ca2f2b664',
      pl: '7881d612a099f534',
      pt: '68b951c13654c776',
      ro: 'b71296d116276fc0',
      ru: '7335d7e6f68fa21d',
      es: 'db64ff2ec2519ab6',
      th: '5ca42522be5fcd7b',
      vi: '4cc3ff1a26801ddf',
      ar: '3d1fa2cc130bafcc',
      bn: '2b495c277d0baeff',
      ca: 'e450d9a36fa932a0',
      cs: 'f57d582789db95e1',
      el: 'b149d9cd3fbd4ccc',
      eu: '1e59236f40907e1f',
      fa: '668583103729546f',
      fil: 'ab1f01af611c2e72',
      hi: '4362614baf67424e',
      hu: '979b7d7b74398e91',
      id: '0f8cd83875684f8d',
      'sr-Latn': 'b87bb5bf67fc782a',
      tr: 'c817b5cffe65865b',
      uk: '026745d77e37cb71',
      ur: '52c6262f376dc5a6',
      'zh-Hant': '82e8fd1917e8494b',
    });
  });
});
