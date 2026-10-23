// Public API of the fort_siege module: windows and other modules import from here.
export { FortSiege, HERALD_WINDOW } from './state';
export {
  FORT_COUNT,
  Phase,
  Role,
  canHandInSigns,
  canRegister,
  canWithdraw,
  listedGuildAttacks,
  ownRank,
  wouldAttack,
  type RegistrationState,
} from './codec';
