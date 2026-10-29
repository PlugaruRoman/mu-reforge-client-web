import { gameVersion } from '@/version';

/** Ids per group of the active version (contract.ts `serverGroupSize`), 256 when it sets none. */
function groupSize(): number {
  return gameVersion?.protocol.serverGroupSize ?? 256;
}

/** The server list group (button) a connect server's `ServerId` belongs to. */
export function serverGroupOf(serverId: number): number {
  return Math.floor(serverId / groupSize());
}

/** The channel of a `ServerId` inside its group, 0-based - the id a published channel name uses. */
export function serverChannelOf(serverId: number): number {
  return serverId % groupSize();
}
