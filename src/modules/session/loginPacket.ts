import { gameVersion } from '@/version';
import { MAX_PASSWORD_LENGTH } from '../servers/serverAccounts';

/** `LoginLongPassword.Password`: 20 bytes. */
export const LONG_PASSWORD_LENGTH = 20;

/** How long a typed password may be for the active version's login packet (`protocol.loginPacket`). */
export function maxPasswordLength(): number {
  return gameVersion.protocol.loginPacket === 'long' ? LONG_PASSWORD_LENGTH : MAX_PASSWORD_LENGTH;
}
