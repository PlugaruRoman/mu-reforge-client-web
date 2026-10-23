import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadGameVersion } from '@/version';
import { scanItemLinks, stripItemLinks } from './chatItemLinks';

/**
 * Our server expands a client's slot token into `\x01` + the hex of the sender's item + `\x02`
 * (S GameServer/MessageHandler/ChatItemLinkExpander.cs: `Convert.ToHexString`, upper case). At
 * 106.3 that item is `ItemSerializerExtended`'s 5-15 bytes.
 */
describe("our server's chat item links (106.3)", () => {
  beforeAll(() => loadGameVersion('reforge'));
  afterAll(() => loadGameVersion('season6'));

  // Kris +7 (0/0), durability 30, flags 0x06 = luck + skill: the 5-byte extended item.
  const KRIS = '\x01' + '0000071E06' + '\x02';

  it('reads the item out of the hex', () => {
    const line = `selling ${KRIS} cheap`;
    const [hit, ...rest] = scanItemLinks(line);
    expect(rest).toEqual([]);
    expect(hit.item).toMatchObject({ group: 0, num: 0, lvl: 7, luck: true, hasSkill: true });
    expect(line.slice(hit.start, hit.end)).toBe(KRIS);
    expect(stripItemLinks(line)).toBe('selling cheap');
  });

  it('skips hex whose length is not the one item it encodes', () => {
    // Flags 0x01 promise an option byte that is missing.
    expect(scanItemLinks('\x01' + '0000071E01' + '\x02')).toEqual([]);
  });
});
