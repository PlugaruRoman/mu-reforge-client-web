import { EventBus } from '@/core/eventBus';
import { playUiSound } from '@/controllers/sound';
import { SoulPointInfoPacket, SoulPointResetResultPacket } from '@versions/reforge/packets/accountSystems';
import { SoulPoints, SoulResetResult } from './state';

/** Registers this module's packet listeners (see ../module.ts). Our client: Network/Reforge/SoulPointPackets.cpp. */
export function installNet(): void {
  EventBus.on('SoulPointInfo', packet => {
    if (packet.byteLength < 9) return;
    const p = new SoulPointInfoPacket(packet);
    // The slots, then the 24-byte cost trailer; a shorter frame is not read (HandleSoulPointInfo).
    if (packet.byteLength < 9 + p.Count * 5 + 24) return;
    SoulPoints.setInfo(p.Available, p.Slots, p.Balances, p.Costs);
  });

  EventBus.on('SoulPointResetResult', packet => {
    if (packet.byteLength < SoulPointResetResultPacket.Length) return;
    const result = new SoulPointResetResultPacket(packet).Result as SoulResetResult;
    SoulPoints.setResetResult(result);
    playUiSound(result === SoulResetResult.Success ? 'changeUp' : 'error');
  });
}
