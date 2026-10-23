import { EventBus } from '@/core/eventBus';
import { playUiSound } from '@/controllers/sound';
import { VipBuyResultPacket, VipStatusPacket } from '@versions/reforge/packets/accountSystems';
import { Vip, VipBuyResult } from './state';

/** Registers this module's packet listeners (see ../module.ts). Our client: Network/Reforge/VipPackets.cpp. */
export function installNet(): void {
  EventBus.on('VipStatus', packet => {
    if (packet.byteLength < VipStatusPacket.Length) return;
    const p = new VipStatusPacket(packet);
    Vip.setStatus(p.Remaining, p.WCoin, p.Prices);
  });

  EventBus.on('VipBuyResult', packet => {
    if (packet.byteLength < VipBuyResultPacket.Length) return;
    const p = new VipBuyResultPacket(packet);
    Vip.setBuyResult(p.Result, p.Remaining, p.WCoin);
    playUiSound(p.Result === VipBuyResult.Success ? 'changeUp' : 'error');
  });
}
