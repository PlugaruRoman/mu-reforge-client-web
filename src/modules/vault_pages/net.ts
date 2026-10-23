import { reaction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { Economy } from '../economy/economy';
import { VaultPages } from './state';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // C2 DD 00: [current][count] at 5 and 6, after the vault opened and after each page change
  // (S RemoteView/Vault/ShowVaultPlugIn.cs:45, GameLogic/PlayerActions/Vault/VaultPageAction.cs:36).
  EventBus.on('VaultPageInfo', packet => {
    if (packet.byteLength < 7) return;
    VaultPages.setInfo(packet.getUint8(5), packet.getUint8(6));
  });

  // A closed vault forgets its pages: the next open starts on the server's page info again.
  reaction(
    () => Economy.vaultOpen,
    open => open || VaultPages.reset()
  );
}
