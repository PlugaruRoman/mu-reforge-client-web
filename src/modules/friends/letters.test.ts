import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
vi.mock('@/controllers/sound/sfx', async importOriginal => ({ ...(await importOriginal<object>()), playSfx: () => 0 }));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Messenger } = await import('./messenger');
const { installNet } = await import('./net');

installNet();

const ascii = (text: string) => Array.from(text, c => c.charCodeAt(0));

/**
 * Our server's AddLetter, C3 107 bytes (S ServerToClientPackets.xml AddLetter, written by
 * RemoteView/Messenger/AddToLetterListPlugIn.cs): index u16 LE at 4, sender 10 at 6, the
 * "yyyy-MM-dd HH:mm:ss" date 30 at 16, a 60-byte subject at 46, the state at 106.
 */
function addLetter(index: number, subject: string, state: number): DataView {
  const bytes = new Uint8Array(107);
  bytes.set([0xc3, 107, 0xc6], 0);
  bytes[4] = index & 0xff;
  bytes[5] = index >> 8;
  bytes.set(ascii('Roman'), 6);
  bytes.set(ascii('2026-10-21 18:30:00'), 16);
  bytes.set(ascii(subject), 46);
  bytes[106] = state;
  return new DataView(bytes.buffer);
}

describe('letters on our server (106.3)', () => {
  it('reads the 60-byte subject and the state at 106 of the 107-byte AddLetter', () => {
    // 40 characters: past the classic 32-byte subject, inside ours.
    const subject = 'A subject longer than the old thirty two';
    EventBus.emit('AddLetter', addLetter(3, subject, 0));
    const letter = Messenger.letters.find(l => l.index === 3);
    if (!letter) throw new Error('no letter 3');
    expect(letter).toMatchObject({ sender: 'Roman', subject, read: true, isNew: false, timestamp: '2026-10-21 18:30:00' });

    EventBus.emit('AddLetter', addLetter(4, 'hi', 2));
    expect(Messenger.letters.find(l => l.index === 4)).toMatchObject({ subject: 'hi', read: false, isNew: true });
  });

  it('reads the body of OpenLetterExtended at 50, after the 42-byte appearance block', () => {
    // S RemoteView/Messenger/ShowLetterExtendedPlugIn.cs: C4, index at 4, appearance 42 at 6,
    // rotation 48, animation 49, the message from 50.
    const message = ascii('See you in Devias');
    const bytes = new Uint8Array(50 + message.length);
    bytes.set([0xc4, 0, bytes.length, 0xc7, 3, 0], 0);
    bytes.fill(0xff, 6, 48);
    bytes.set(message, 50);
    EventBus.emit('OpenLetterExtended', new DataView(bytes.buffer));
    expect(Messenger.letters.find(l => l.index === 3)?.body).toBe('See you in Devias');
  });
});
