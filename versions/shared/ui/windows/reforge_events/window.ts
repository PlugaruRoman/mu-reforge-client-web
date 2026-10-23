import { defineWindow } from '@/controllers/interface/windows';
import { DoppelgangerHud, FortSiegeWindows, ImperialGuardianHud } from '.';

export default [
  defineWindow({ id: 'doppelganger_frame', module: 'doppelganger', slot: 'hud', order: 405, component: DoppelgangerHud }),
  defineWindow({ id: 'imperial_guardian_timer', module: 'imperial_guardian', slot: 'hud', order: 406, component: ImperialGuardianHud }),
  defineWindow({ id: 'fort_siege', module: 'fort_siege', slot: 'hud', order: 313, component: FortSiegeWindows }),
];
