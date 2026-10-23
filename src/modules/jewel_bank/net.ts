import { EventBus } from '@/core/eventBus';
import { JewelBank, parseJewelBankList } from './state';

/** Registers this module's packet listeners (see ../module.ts). Our client: Network/Reforge/JewelBankPackets.cpp. */
export function installNet(): void {
  // Sent on entering the world, on request and after every deposit or withdrawal.
  EventBus.on('JewelBankList', packet => {
    const counts = parseJewelBankList(packet);
    if (counts) JewelBank.setCounts(counts);
  });
}
