/**
 * Items linked into chat. Alt+click on an item puts it in the line as `{`,
 * its 12 item bytes in base64url, `}`: 18 plain ASCII characters, which every
 * client and the server pass along. A client reads the item back out of the
 * bytes, shows its name and, on hover, its tooltip.
 *
 * The chat box shows the name in brackets instead of the bytes; `labelsToWire`
 * swaps the names back for their links when the line is sent.
 *
 * Mu Reforge's server writes its own links too: `\x01` + the sender's item bytes in hex + `\x02`
 * (S GameServer/MessageHandler/ChatItemLinkExpander.cs, from the sender's inventory, in the
 * sender's item codec, the extended 5-15 bytes at 106.3; client GameLogic/Reforge/ReforgeChatLinks.h).
 * They are read the same way, with the active version's codec. Where the version says
 * `protocol.chatItemLinks: 'slot'`, a link goes out as `\x01` + the inventory slot in hex + `\x02`
 * (the server fills in the item it holds there) and only the server's links are read: a `{...}`
 * token is anyone's say-so about an item.
 */

import type { Item } from '../../ecs/world';
import { ItemSerializer, readItem } from '@/controllers/item_rules';
import { itemDef, itemStats } from '@/controllers/item_rules';
import { itemDisplayName } from '../../controllers/interface/itemTooltip';
import { gameVersion } from '@/version';

/** `{` + 16 characters + `}`. */
export const ITEM_LINK_LENGTH = 18;

/** Ours (`{` base64url `}`) or the server's (`\x01` hex of a 5-15 byte item `\x02`). */
// eslint-disable-next-line no-control-regex -- the server's link is framed by the control bytes 0x01/0x02 (ChatItemLinkExpander.cs).
const TOKEN = /\{([A-Za-z0-9_-]{16})\}|\x01((?:[0-9A-Fa-f]{2}){5,15})\x02/g;

/** The server's links only (`chatItemLinks: 'slot'`). */
// eslint-disable-next-line no-control-regex -- the same control-byte frame as TOKEN.
const SERVER_TOKEN = /\x01((?:[0-9A-Fa-f]{2}){5,15})\x02/g;

/** What the sender sends under `slot`, before the server expands it: two hex digits. */
// eslint-disable-next-line no-control-regex -- the same control-byte frame as TOKEN.
const SLOT_TOKEN = /\x01([0-9A-Fa-f]{2})\x02/g;

const slotLinks = () => gameVersion.protocol.chatItemLinks === 'slot';

/** The hero's inventory by server slot, handed in by the chat module's install (`setItemLinkBag`). */
let bag: () => readonly (Item | null)[] = () => [];

export function setItemLinkBag(read: () => readonly (Item | null)[]): void {
  bag = read;
}

const hasLink = (text: string) => text.includes('{') || text.includes('\x01');

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

/**
 * The link an item is sent as. Under `slot` it is the hero's own inventory slot; an item that is
 * not in the hero's inventory (a shop's, another player's) goes as its plain name.
 */
export function itemLinkToken(item: Item): string {
  if (slotLinks()) {
    const slot = bag().indexOf(item);
    return slot >= 0 && slot <= 0xff ? `\x01${slot.toString(16).toUpperCase().padStart(2, '0')}\x02` : itemLinkLabel(item);
  }
  const bytes = new Uint8Array(ItemSerializer.NeededSpace);
  // Items built for a window (the cash shop) carry no durability: a new one is full.
  const durability = item.durability ?? itemStats(item)?.maxDurability;
  ItemSerializer.SerializeItem(bytes, { ...item, durability });
  // The 380 option is only in the bytes the server sent, not on the item.
  if (item.raw?.length === bytes.length) bytes[5] |= item.raw[5] & 0x0f;
  return `{${toBase64Url(bytes)}}`;
}

/** The name the chat box and the log show a link as. */
export function itemLinkLabel(item: Item): string {
  return `[${itemDisplayName(item)}]`;
}

// A link is read once, however many rows and balloons draw it.
const decoded = new Map<string, Item | null>();
const DECODED_MAX = 512;

/** The item a link's 16 characters stand for, or null when they are not one this client knows. */
export function itemFromLink(payload: string): Item | null {
  const known = decoded.get(payload);
  if (known !== undefined) return known;

  let item: Item | null = null;
  try {
    const bytes = fromBase64Url(payload);
    if (bytes.length === ItemSerializer.NeededSpace) {
      const read = ItemSerializer.DeserializeItem(bytes);
      if (itemDef(read.group, read.num)) item = read;
    }
  } catch {
    item = null;
  }

  return remember(payload, item);
}

/** The item a server link's hex stands for: every byte one item of the active codec, or null. */
export function itemFromServerLink(hex: string): Item | null {
  const key = `x${hex}`;
  const known = decoded.get(key);
  if (known !== undefined) return known;

  let item: Item | null = null;
  try {
    const pairs = hex.match(/../g);
    if (pairs) {
      const bytes = Uint8Array.from(pairs, h => parseInt(h, 16));
      const read = readItem(bytes);
      if (read.length === bytes.length && itemDef(read.item.group, read.item.num)) item = read.item;
    }
  } catch {
    item = null;
  }

  return remember(key, item);
}

/** Caches a read link, dropping the oldest once the cache is full. */
function remember(key: string, item: Item | null): Item | null {
  const oldest = decoded.keys().next();
  if (decoded.size >= DECODED_MAX && !oldest.done) decoded.delete(oldest.value);
  decoded.set(key, item);
  return item;
}

type ItemLinkHit = { start: number; end: number; item: Item };

/** Every readable link in the line, in order. */
export function scanItemLinks(text: string): ItemLinkHit[] {
  const hits: ItemLinkHit[] = [];
  if (!hasLink(text)) return hits;
  const slot = slotLinks();
  for (const m of text.matchAll(slot ? SERVER_TOKEN : TOKEN)) {
    const item = slot ? itemFromServerLink(m[1]) : m[1] !== undefined ? itemFromLink(m[1]) : itemFromServerLink(m[2]);
    if (item) hits.push({ start: m.index!, end: m.index! + m[0].length, item });
  }
  return hits;
}

/** The line without its links, for the word matches that fire emotes: the bytes spell anything. */
export function stripItemLinks(text: string): string {
  if (!hasLink(text)) return text;
  return text.replace(TOKEN, ' ').replace(SLOT_TOKEN, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * The label a link takes in a box already holding `links`: its own name, or,
 * when a different item already shows under that name, the name with a number
 * (two Kris +7 with other options must not both send the second one).
 */
export function uniqueLinkLabel(
  label: string,
  token: string,
  links: ReadonlyMap<string, string>
): string {
  let candidate = label;
  for (let n = 2; links.has(candidate) && links.get(candidate) !== token; n++) {
    candidate = `${label.slice(0, -1)} #${n}]`;
  }
  return candidate;
}

/** The typed line as it is sent: every label of a link in `links` becomes the link. */
export function labelsToWire(text: string, links: ReadonlyMap<string, string>): string {
  let wire = text;
  // Longest first, so a name that holds another is swapped whole.
  const labels = [...links.keys()].sort((a, b) => b.length - a.length);
  for (const label of labels) {
    if (wire.includes(label)) wire = wire.split(label).join(links.get(label)!);
  }
  return wire;
}

/**
 * The chat box's draft as it opens: empty, or the Alt+clicked item's link. `OpenningProcess`
 * empties the field (NewUIChatInputBox.cpp:794), and a sent line leaves it empty too (:571).
 */
export function freshDraft(
  insert: { label: string; token: string } | null
): { text: string; links: Map<string, string> } {
  return insert
    ? { text: insert.label, links: new Map([[insert.label, insert.token]]) }
    : { text: '', links: new Map() };
}

/** A sent line back as the chat box shows it, for the history keys. */
export function wireToLabels(wire: string): { text: string; links: Map<string, string> } {
  const links = new Map<string, string>();
  let text = '';
  let at = 0;
  for (const hit of slotLinks() ? scanSlotLinks(wire) : scanItemLinks(wire)) {
    const token = wire.slice(hit.start, hit.end);
    const label = uniqueLinkLabel(itemLinkLabel(hit.item), token, links);
    links.set(label, token);
    text += wire.slice(at, hit.start) + label;
    at = hit.end;
  }
  return { text: text + wire.slice(at), links };
}

/**
 * A sent line as the sender's own log shows it when nothing echoes it back expanded (a whisper): under
 * `slot` the server only expands the copy it forwards, so the slot tokens show as their names.
 */
export function ownLineOf(wire: string): string {
  return slotLinks() ? wireToLabels(wire).text : wire;
}

/** A sent line's slot links (`slot`), read back against the hero's inventory for the history keys. */
function scanSlotLinks(text: string): ItemLinkHit[] {
  const hits: ItemLinkHit[] = [];
  if (!text.includes('\x01')) return hits;
  for (const m of text.matchAll(SLOT_TOKEN)) {
    const item = bag()[parseInt(m[1], 16)];
    const start = m.index ?? 0;
    if (item) hits.push({ start, end: start + m[0].length, item });
  }
  return hits;
}
