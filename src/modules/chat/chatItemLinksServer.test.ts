import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadGameVersion } from '@/version';
import { itemLinkToken, labelsToWire, ownLineOf, scanItemLinks, setItemLinkBag, stripItemLinks, wireToLabels } from './chatItemLinks';
import type { Item } from '../../ecs/world';

/**
 * Our server expands a client's slot token into `\x01` + the hex of the sender's item + `\x02`
 * (S GameServer/MessageHandler/ChatItemLinkExpander.cs: `Convert.ToHexString`, upper case). At
 * 106.3 that item is `ItemSerializerExtended`'s 5-15 bytes.
 */
describe("our server's chat item links (106.3)", () => {
  beforeAll(() => loadGameVersion('reforge'), 60_000);
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

  it("sends the hero's inventory slot, which the server swaps for the item it holds there", () => {
    const sword: Item = { group: 0, num: 0, lvl: 7 };
    const items: (Item | null)[] = new Array(20).fill(null);
    items[13] = sword;
    setItemLinkBag(() => items);
    try {
      const token = itemLinkToken(sword);
      expect(token).toBe('\x010D\x02');
      const wire = labelsToWire('look [Kris +7]', new Map([['[Kris +7]', token]]));
      expect(wire).toBe('look \x010D\x02');
      // The history keys read it back against the bag.
      expect(wireToLabels(wire).links.get(wireToLabels(wire).text.slice(5))).toBe(token);
    } finally {
      setItemLinkBag(() => []);
    }
  });

  // A whisper is not echoed back expanded: the sender's own line shows the item's name, not the raw slot token.
  it("logs the sender's own slot link as the item's name", () => {
    const sword: Item = { group: 0, num: 0, lvl: 7 };
    const items: (Item | null)[] = new Array(20).fill(null);
    items[13] = sword;
    setItemLinkBag(() => items);
    try {
      const line = ownLineOf('look \x010D\x02 cheap');
      expect([line.includes('\x01'), line.includes('\x02')]).toEqual([false, false]);
      expect(line).toMatch(/^look \[.+\] cheap$/);
    } finally {
      setItemLinkBag(() => []);
    }
  });

  it('sends an item that is not in the bag as its plain name', () => {
    expect(itemLinkToken({ group: 0, num: 0, lvl: 7 })).toMatch(/^\[.*\]$/);
  });

  it("reads no client-written {base64} token: anyone can type one", () => {
    expect(scanItemLinks('scam {AAAHHgYAAAAAAAAA} cheap')).toEqual([]);
  });
});
