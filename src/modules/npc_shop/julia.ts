import { observable, runInAction } from 'mobx';
import { CloseNpcRequestPacket, EnterMarketPlaceRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import { ENUM_WORLD } from '@/core/types';
import { Ecs } from '@/ecs/current';
import { Session } from '../session';

/**
 * Market Union Member Julia (NPC 547, `NpcWindow.JuliaWarpMarketServer`, 0x25): our server makes her
 * the warp between Lorencia and the Loren Market (S Updates/AddLorenMarketJuliaWarpPlugIn.cs).
 * `CUnitedMarketPlaceWindow` (UI/Inventory/UnitedMarketPlaceWindow.cpp): the market's lines or the
 * town's, Warp sends `EnterMarketPlaceRequest` (C1 BF 17, S EnterMarketPlaceHandlerPlugIn.cs), Close
 * sends `CloseNpcRequest`.
 */
export const Julia = observable(
  {
    open: false,
    /** In the Loren Market: she offers the way back to town. */
    inMarket: false,
    /** Warp was pressed; the button stays locked until the window opens again (`LockEnterButton`). */
    warping: false,
  },
  {},
  { deep: false }
);

/** The server opened her window. */
export function openJulia(): void {
  runInAction(() => {
    Julia.open = true;
    Julia.inMarket = Ecs.world?.mapIndex === ENUM_WORLD.WD_79UNITEDMARKETPLACE;
    Julia.warping = false;
  });
}

/** Warp: the server moves the hero, which closes every window. */
export function juliaWarp(): void {
  if (!Julia.open || Julia.warping) return;
  runInAction(() => (Julia.warping = true));
  Session.sendToGS(EnterMarketPlaceRequestPacket.createPacket().buffer);
}

/** Close: the window goes, and the server leaves the NPC dialog. */
export function closeJulia(): void {
  if (!Julia.open) return;
  runInAction(() => {
    Julia.open = false;
    Julia.warping = false;
  });
  Session.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
}

/** The hero left the map or the connection dropped: nothing to tell the server. */
export function forgetJulia(): void {
  if (Julia.open) runInAction(() => (Julia.open = false));
}
