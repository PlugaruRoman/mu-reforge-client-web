import { Hero } from '../hero';
import { Session } from '../session';
import { PublicChatMessagePacket } from '@versions/shared/packets/ClientToServerPackets';

/**
 * Sends `line` as a public chat line, unseen by the chat input: a window button whose action our
 * server takes as a chat command (our C++ client's `SendChatCommand`, Network/Reforge/HudPackets.cpp).
 * ASCII only, like the packet's setter.
 */
export function sendChatLine(line: string): void {
  const packet = PublicChatMessagePacket.createPacket(PublicChatMessagePacket.getRequiredSize(10 + line.length));
  packet.setCharacter(Hero.name);
  packet.setMessage(line);
  Session.sendToGS(packet.buffer);
}
