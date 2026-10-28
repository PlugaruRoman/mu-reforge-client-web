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

    expect(KEYS.length).toBe(3528);
    expect(hashes).toEqual({
      en: '29abd5f01493dc5f',
      bg: '3e6d94aa4b7a1d62',
      zh: 'b00d3d8001f40225',
      fr: '813cbd5949e14313',
      de: '13269562b9a57ba8',
      it: '917bcd1542608b14',
      ja: '97d6bd99ead60dbc',
      ko: 'c3dba9d5579cf829',
      pl: '385cc9d26fc95489',
      pt: 'fd39f6c177e7fb06',
      ro: '7991cda4e5500349',
      ru: 'e86312855cadc8ca',
      es: '8176bfd3d9498755',
      th: 'de33ce3e06c61413',
      vi: 'b43c1797bc7af9c5',
      ar: 'c1b3340c87eca81e',
      bn: '5c0cd3f87e2eedfd',
      ca: '37bbeb7bbb80cf36',
      cs: '84ba27099f128e3e',
      el: 'fee0dbec97add7d5',
      eu: 'fa8c06801d8a5a0a',
      fa: '763fcbb209a5d91d',
      fil: 'bbac4cb5004b3663',
      hi: 'a30024a8cd8fb1c2',
      hu: 'dd458b1690c18fe2',
      id: '4e464573a14256af',
      'sr-Latn': '5176de1344c84dd2',
      tr: '4da7cd35d3b2f182',
      uk: '84f95c2b4f19cf22',
      ur: '904107c14c3da6e3',
      'zh-Hant': 'f6319725fc953651',
    });
  });
});
