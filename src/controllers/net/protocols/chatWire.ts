/**
 * Chat text on the wire. The packet writers put one byte per character, while
 * OpenMU reads UTF-8: a line goes out as its UTF-8 bytes, one per character,
 * so accents, other alphabets and emoji typed with the Windows picker reach the
 * other players intact. The readers decode UTF-8 themselves (`readWireString`).
 */

const encoder = new TextEncoder();

/** The line as the string the packet writers turn into its UTF-8 bytes. */
export function toChatWire(text: string): string {
  let wire = '';
  for (const byte of encoder.encode(text)) wire += String.fromCharCode(byte);
  return wire;
}

/** The first `max` characters, never half of an emoji's surrogate pair. */
export function clipChatText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

/**
 * The longest start of `text` whose UTF-8 is at most `maxBytes`, never cutting a character in
 * two: a fixed text field OpenMU reads as UTF-8 (the personal shop title, 26 bytes).
 */
export function fitUtf8(text: string, maxBytes: number): string {
  let bytes = 0;
  let end = 0;
  for (const ch of text) {
    bytes += encoder.encode(ch).length;
    if (bytes > maxBytes) break;
    end += ch.length;
  }
  return text.slice(0, end);
}
