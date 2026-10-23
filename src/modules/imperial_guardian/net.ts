import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { ENUM_WORLD } from '../../core/types';
import {
  ImperialGuardianClearResultClearResultEnum as Clear,
  ImperialGuardianClearResultPacket,
  ImperialGuardianEnterResultEnterResultEnum as Enter,
  ImperialGuardianEnterResultPacket,
  ImperialGuardianRemainingTimePacket,
} from '@versions/reforge/packets/ServerToClientPackets';
import { ImperialGuardian, type GuardianBox } from './state';

const FORTRESS = new Set([
  ENUM_WORLD.WD_69EMPIREGUARDIAN1,
  ENUM_WORLD.WD_70EMPIREGUARDIAN2,
  ENUM_WORLD.WD_71EMPIREGUARDIAN3,
  ENUM_WORLD.WD_72EMPIREGUARDIAN4,
]);

const REFUSALS: Partial<Record<number, GuardianBox>> = {
  [Enter.MissingQuestItem]: { kind: 'missingQuestItem' },
  [Enter.Full]: { kind: 'full' },
  [Enter.StillRunning]: { kind: 'zoneCooldown' },
  [Enter.PartyRequired]: { kind: 'partyRequired' },
};

/** F7 02 / 04 / 06 as our client reads them (WSclient.cpp:12633-12735). */
export function installNet(): void {
  EventBus.on('ImperialGuardianEnterResult', packet => {
    const p = new ImperialGuardianEnterResultPacket(packet);
    runInAction(() => {
      if (p.Result === Enter.Success) ImperialGuardian.entered(p.Round, p.Zone, p.RemainingTimeMilliseconds);
      else if (p.Result === Enter.TimeRemaining)
        ImperialGuardian.showBox({ kind: 'entryDelay', minutes: Math.floor(p.RemainingTimeMilliseconds / 60000) });
      else {
        const box = REFUSALS[p.Result];
        if (box) ImperialGuardian.showBox(box);
      }
    });
  });

  EventBus.on('ImperialGuardianRemainingTime', packet => {
    const p = new ImperialGuardianRemainingTimePacket(packet);
    runInAction(() => ImperialGuardian.tick(p.Phase, p.RemainingTimeMilliseconds, p.MonsterCount));
  });

  EventBus.on('ImperialGuardianClearResult', packet => {
    const p = new ImperialGuardianClearResultPacket(packet);
    const { round, zone } = ImperialGuardian;
    const box: GuardianBox =
      p.Result === Clear.ZoneCleared
        ? { kind: 'zoneCleared', round, zone }
        : p.Result === Clear.RoundCleared
          ? { kind: 'roundCleared', round, experience: p.Experience }
          : { kind: 'failed' };
    runInAction(() => ImperialGuardian.showResult(box));
  });

  EventBus.on('warpCompleted', ({ map }) => {
    if (!FORTRESS.has(map)) runInAction(() => ImperialGuardian.reset());
  });
  EventBus.on('wsClosed', () => runInAction(() => ImperialGuardian.reset()));
}
