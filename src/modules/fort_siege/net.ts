import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { Ecs } from '../../ecs/current';
import { registerNpcClick } from '../npc_shop';
import { readCaptureLine, readFighters, readRegistrationState, readSides, readWarps } from './codec';
import { FortSiege, HERALD_NUMBER } from './state';

const map = () => Ecs.world?.mapIndex ?? -1;

/** C1/C2 EF 01-06 (Network/Reforge/PacketRoutes.cpp) and the Herald's click (`ReforgeNpcTalk.cpp`). */
export function installNet(): void {
  EventBus.on('FortSiegeSides', packet => {
    const { sides, area } = readSides(packet);
    runInAction(() => FortSiege.setSides(sides, area, map()));
  });

  // 02, the capturer's own state, stays unread as in our client: the capture line and the chat show it.
  EventBus.on('FortCaptureState', () => {});

  EventBus.on('FortWarps', packet => {
    const { exp, drop, zenTax } = readWarps(packet);
    runInAction(() => (FortSiege.ownerBuff = { exp, drop, zenTax }));
  });

  EventBus.on('FortRegistrationState', packet => {
    const state = readRegistrationState(packet);
    if (state) runInAction(() => FortSiege.setRegistration(state));
  });

  EventBus.on('FortCaptureLine', packet => {
    const line = readCaptureLine(packet);
    runInAction(() => FortSiege.setCapture(line, map()));
  });

  EventBus.on('FortFighters', packet => {
    const fighters = readFighters(packet);
    runInAction(() => FortSiege.setFighters(fighters));
  });

  registerNpcClick(HERALD_NUMBER, npc => {
    FortSiege.openHerald(npc.netId);
    return true;
  });

  EventBus.on('wsClosed', () => runInAction(() => FortSiege.reset()));
}
