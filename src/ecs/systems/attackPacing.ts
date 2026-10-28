import { gameVersion } from '@/version';
import { getBaseClass, type CharacterClassNumber } from '@/core/types';
import { SERVER_ATTACK_SPEED_MAX } from '../../controllers/anim/playSpeed';

/**
 * The cap the server checks this class's attack speed with: the version's own per class
 * (`protocol.attackSpeedCaps` - Mu Reforge caps each class between 245 and 262), else Season 6's
 * 200. Here and not in the anim controller: the controller is reached by the proxy, which must not
 * load the browser-only version layer (tools/checks, rule 5).
 */
export function serverAttackSpeedCap(cls?: CharacterClassNumber): number {
  const caps = gameVersion?.protocol.attackSpeedCaps;
  if (!caps || cls === undefined) return SERVER_ATTACK_SPEED_MAX;

  return caps[getBaseClass(cls)] ?? SERVER_ATTACK_SPEED_MAX;
}
