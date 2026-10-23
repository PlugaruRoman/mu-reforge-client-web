import { EventBus } from '@/core/eventBus';
import { playUiSound } from '@/controllers/sound';
import {
  AutoStatConfigurationPacket,
  GrandResetInfoPacket,
  MasterResetInfoPacket,
  MasterResetResultPacket,
  ResetInfoPacket,
  StatResetInfoPacket,
  StatResetResultPacket,
} from '@versions/reforge/packets/accountSystems';
import { PaidResetResult, Resets, type PaidReset, type PaidResetInfo } from './state';

const paidInfo = (p: StatResetInfoPacket | MasterResetInfoPacket): PaidResetInfo => ({
  balances: p.Balances,
  costs: p.Costs,
  refundable: p.RefundablePoints,
  requiredLevel: p.RequiredLevel,
  precondition: p.Precondition,
});

/** Registers this module's packet listeners (see ../module.ts). Our client: Network/Reforge/ResetPackets.cpp. */
export function installNet(): void {
  EventBus.on('ResetInfo', packet => {
    if (packet.byteLength < ResetInfoPacket.Length) return;
    const p = new ResetInfoPacket(packet);
    Resets.setReset({ canReset: p.CanReset, reason: p.Reason, requiredLevel: p.RequiredLevel, requiredZen: p.RequiredZen, currentResets: p.CurrentResets });
  });

  EventBus.on('GrandResetInfo', packet => {
    if (packet.byteLength < GrandResetInfoPacket.Length) return;
    const p = new GrandResetInfoPacket(packet);
    Resets.setGrand({
      canReset: p.CanReset,
      reason: p.Reason,
      requiredResets: p.RequiredResets,
      requiredLevel: p.RequiredLevel,
      requiredZen: p.RequiredZen,
      currentGrandResets: p.CurrentGrandResets,
      currentResets: p.CurrentResets,
      limit: p.Limit,
    });
  });

  const onPaidInfo = (reset: PaidReset, Packet: typeof StatResetInfoPacket | typeof MasterResetInfoPacket) => (packet: DataView) => {
    if (packet.byteLength < Packet.Length) return;
    Resets.setPaid(reset, paidInfo(new Packet(packet)));
  };
  EventBus.on('StatResetInfo', onPaidInfo('stats', StatResetInfoPacket));
  EventBus.on('MasterResetInfo', onPaidInfo('master', MasterResetInfoPacket));

  const onPaidResult = (reset: PaidReset) => (packet: DataView) => {
    if (packet.byteLength < StatResetResultPacket.Length) return;
    const result = new MasterResetResultPacket(packet).Result as PaidResetResult;
    playUiSound(result === PaidResetResult.Success ? 'changeUp' : 'error');
    Resets.paidAnswered(reset, result);
  };
  EventBus.on('StatResetResult', onPaidResult('stats'));
  EventBus.on('MasterResetResult', onPaidResult('master'));

  EventBus.on('AutoStatConfiguration', packet => {
    if (packet.byteLength < AutoStatConfigurationPacket.Length) return;
    const p = new AutoStatConfigurationPacket(packet);
    Resets.setAuto({ enabled: p.Enabled, interval: p.Interval, percents: p.Percents }, p.PointsPerLevelUp);
  });
}
