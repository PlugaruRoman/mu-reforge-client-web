/**
 * Our server's hand-written frames read by the Olympiad, Fort Siege and party HUD modules
 * (`olympiad.ts`, `fortSiege.ts`, `partyMemberBuffs.ts`), listed in the packet set by `index.ts`.
 */
import { DeathRecordsPacket, OlympiadBoardPacket } from './olympiad';
import {
  FortCaptureLinePacket,
  FortCaptureStatePacket,
  FortFightersPacket,
  FortRegistrationStatePacket,
  FortSiegeSidesPacket,
  FortWarpsPacket,
} from './fortSiege';
import { PartyMemberBuffsPacket } from './partyMemberBuffs';

export const SYSTEM_PACKETS = [
  OlympiadBoardPacket,
  DeathRecordsPacket,
  FortSiegeSidesPacket,
  FortCaptureStatePacket,
  FortWarpsPacket,
  FortRegistrationStatePacket,
  FortCaptureLinePacket,
  FortFightersPacket,
  PartyMemberBuffsPacket,
] as const;
