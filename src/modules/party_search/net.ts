import { EventBus } from '@/core/eventBus';
import { PartySearch, parseJoinResult, parseList, parseStatus } from './state';

/** Registers this module's packet listeners (see ../module.ts). Our client: Network/Reforge/PartySearchPackets.cpp. */
export function installNet(): void {
  // D8 01: the player's own listing and auto-accept preference, after a list request or a save.
  EventBus.on('PartySearchStatus', packet => {
    const status = parseStatus(packet);
    if (status) PartySearch.setStatus(status.result, status.settings);
  });

  // D8 02: the parties looking for members.
  EventBus.on('PartySearchList', packet => {
    const parties = parseList(packet);
    if (parties) PartySearch.setParties(parties);
  });

  // D8 03: the answer to a join; the server sends the reason with its numbers as a message too.
  EventBus.on('PartySearchJoinResult', packet => {
    const result = parseJoinResult(packet);
    if (result !== null) PartySearch.joinAnswered(result);
  });

  EventBus.on('wsClosed', () => PartySearch.reset());
}
