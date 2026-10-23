import { reaction } from 'mobx';
import type { Item } from '@/ecs/world';
import { EventBus } from '@/core/eventBus';
import { MuWindows } from '@/controllers/interface/windowManager';
import { readItemList } from '@/controllers/item_rules/itemCodec';
import {
  GuildBankLockStatePacket,
  GuildBankPageInfoPacket,
  GuildCastleWarpStatePacket,
  GuildSettingsResponsePacket,
} from '@versions/reforge/packets/ServerToClientPackets';
import { Social } from '../social/social';
import { GuildBank } from './state';

/**
 * C2 DC 01 `GuildBankItemList` (S RemoteView/GuildBank/GuildBankViewPlugIn.cs:35-75): zen u32 LE at 5,
 * CanWithdraw at 9, count at 10, then per item its slot byte and the item in the extended codec.
 */
export function readBankList(view: DataView): { money: number; canWithdraw: boolean; items: { slot: number; item: Item }[] } {
  const count = view.getUint8(10);
  const items = readItemList(view, 11, count, 1).map(({ at, item }) => ({ slot: view.getUint8(at), item }));
  return { money: view.getUint32(5, true), canWithdraw: view.getUint8(9) !== 0, items };
}

/** Registers this module's packet listeners (see ./module.ts). */
export function installNet(): void {
  // The Guild Master NPC answers a member's talk with DC 08, DC 0C and DC 01 instead of a window
  // (S GameLogic/PlayerActions/TalkNpcAction.cs:160-167, GuildBankAction.OpenAsync); DC 08 opens it.
  EventBus.on('GuildBankPageInfo', packet => {
    const p = new GuildBankPageInfoPacket(packet);
    GuildBank.pageInfo(p.CurrentPage, p.PageCount);
  });

  EventBus.on('GuildBankLockState', packet => GuildBank.lockState(new GuildBankLockStatePacket(packet).State));

  EventBus.on('GuildBankItemList', packet => {
    const { money, canWithdraw, items } = readBankList(packet);
    GuildBank.contents(money, canWithdraw, items);
  });

  EventBus.on('GuildSettingsResponse', packet => {
    const p = new GuildSettingsResponsePacket(packet);
    GuildBank.settings(p.DepositRankFlags, p.WithdrawRankFlags);
  });

  EventBus.on('GuildCastleWarpState', packet => GuildBank.castleOwner(new GuildCastleWarpStatePacket(packet).IsCastleOwner));

  // A walk closes the bank with the inventory, like the vault (UI/Reforge/ReforgeVaultLikeWindows.h).
  EventBus.on('heroWalked', () => {
    if (!GuildBank.open) return;
    GuildBank.close();
    MuWindows.setOpen('inventory', false);
  });
  EventBus.on('wsClosed', () => {
    GuildBank.close(false);
    GuildBank.openSettings(false);
  });

  // The guild window asks whether the guild owns the castle each time it opens (ReforgeGuildButtons.cpp `OnOpened`).
  reaction(
    () => Social.guildWindowEnabled && !!Social.myGuild,
    shown => shown && GuildBank.askCastle()
  );
}
