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

    expect(KEYS.length).toBe(3513);
    expect(hashes).toEqual({
      en: '7356da42c1be8053',
      bg: '17f51dac862beac8',
      zh: 'e34465275249b8f0',
      fr: '58f0b57301072433',
      de: '9df86a62f7ac0a87',
      it: 'a5064887a4b4282b',
      ja: 'b4c37d27cb9998f1',
      ko: 'ad22b27ca267cc85',
      pl: 'ea84d2eb5bc42292',
      pt: '2aa0656a6a17e052',
      ro: 'd97bd17a33537b73',
      ru: '8ccde9968612b229',
      es: 'cfd96dd2f8c0cd2d',
      th: '150ce61cdfbae271',
      vi: '5f727211c68ff0e3',
      ar: 'd0f80696b5a94a34',
      bn: '561169f56305f504',
      ca: '284581d1bab2fa05',
      cs: '56d35d6dfc974423',
      el: 'c6908676047def23',
      eu: 'd48f69d9c81e6717',
      fa: 'bab7b3feed46da03',
      fil: '565a852276de9f17',
      hi: '62dea67b4f419685',
      hu: 'af6bcc8744d1c982',
      id: '05eb392b93f2263f',
      'sr-Latn': '75ded43b815b18f1',
      tr: '169717602e71c41b',
      uk: 'c8a27cdcc2d4662d',
      ur: '331ae574619d6349',
      'zh-Hant': '9ba9fe2e46bec788',
    });
  });
});
