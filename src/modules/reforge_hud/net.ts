import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { setNameTint } from '@/controllers/interface/nameTags';
import { Session } from '../session';
import { Hero } from '../hero';
import { Economy } from '../economy/economy';
import { setServerChatCommands, type ChatCommand } from '../chat/chatCommands';
import { ChatCommandListRequestPacket } from '@versions/reforge/packets/ClientToServerPackets';
import {
  AvailableChatCommandPacket,
  CharacterStatusEnum,
  ChaosMachineMixRatePacket,
  GuestAccessGenerateResponsePacket,
  GuestAccessSessionListPacket,
  GuestAccessStatusPacket,
  MapMobSpotListPacket,
  PvpFlagStatePacket,
} from '@versions/reforge/packets/ServerToClientPackets';
import { ReforgeHud } from './state';

/** `DecodePartyMemberBuffs` (Network/Reforge/HudPackets.cpp): `[memberCount]` at 5, then `[count][ids...]` each. */
export function readPartyMemberBuffs(view: DataView): number[][] {
  if (view.byteLength < 6) return [];
  const members: number[][] = [];
  let at = 6;
  for (let m = 0; m < view.getUint8(5) && at < view.byteLength; m++) {
    const count = view.getUint8(at);
    if (at + 1 + count > view.byteLength) break;
    members.push(Array.from({ length: count }, (_, i) => view.getUint8(at + 1 + i)));
    at += 1 + count;
  }
  return members;
}

/** One `AvailableChatCommand` as a completion row: `<short>` for a required parameter, `[short]` otherwise. */
export function chatCommandOf(p: AvailableChatCommandPacket): ChatCommand {
  const usage = p
    .getParameters()
    .map(q => (q.IsRequired ? `<${q.ShortName || q.Name}>` : `[${q.ShortName || q.Name}]`))
    .join(' ');
  return {
    name: p.Command.toLowerCase(),
    usage: usage || undefined,
    help: p.Description || p.Name,
    gm: p.MinimumCharacterStatus >= CharacterStatusEnum.GameMaster,
  };
}

/**
 * The character the chat commands were asked for (`ChatCommandCatalog::RequestOnce`): asked again for
 * another character, since a game master and a player are offered different lists.
 */
let commandsFor: string | null = null;
const commands = new Map<number, ChatCommand>();

/** D8 04, EA, D5, D0 01/02/04, EC and F5 01 (Network/Reforge/PacketRoutes.cpp, WSclient.cpp). */
export function installNet(): void {
  EventBus.on('PartyMemberBuffs', packet => {
    const buffs = readPartyMemberBuffs(packet);
    runInAction(() => ReforgeHud.setPartyBuffs(buffs));
  });

  EventBus.on('PvpFlagState', packet => {
    const p = new PvpFlagStatePacket(packet);
    runInAction(() => ReforgeHud.setPvpFlag(p.PlayerId & 0x7fff, p.RemainingSeconds, performance.now()));
  });
  setNameTint(id => ReforgeHud.pvpTint(id));

  EventBus.on('MapMobSpotList', packet => {
    const spots = new MapMobSpotListPacket(packet).getMobSpots().map(s => ({ x: s.PositionX, y: s.PositionY, name: s.Name }));
    runInAction(() => ReforgeHud.setMobSpots(spots));
  });

  EventBus.on('GuestAccessStatus', packet => {
    const guest = new GuestAccessStatusPacket(packet).IsGuestSession;
    runInAction(() => ReforgeHud.setGuest(guest));
  });
  EventBus.on('GuestAccessGenerateResponse', packet => {
    const p = new GuestAccessGenerateResponsePacket(packet);
    runInAction(() => ReforgeHud.setGenerated(p.Success, p.SessionName, p.Password));
  });
  EventBus.on('GuestAccessSessionList', packet => {
    const sessions = new GuestAccessSessionListPacket(packet).getSessions().map(s => ({
      name: s.SessionName,
      password: s.Password,
      remainingSeconds: s.RemainingSeconds,
      permissions: s.Permissions,
    }));
    runInAction(() => ReforgeHud.setGuestSessions(sessions));
  });

  // `SetServerRate`: a mix id of 0 is no valid combination and clears it.
  EventBus.on('ChaosMachineMixRate', packet => {
    const p = new ChaosMachineMixRatePacket(packet);
    runInAction(() => {
      Economy.serverMixRate = p.MixType === 0 ? null : { mixId: p.MixType, rate: p.SuccessRate, zen: p.Price };
    });
  });

  EventBus.on('AvailableChatCommand', packet => {
    const p = new AvailableChatCommandPacket(packet);
    commands.set(p.Index, chatCommandOf(p));
    setServerChatCommands([...commands.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c));
  });
  EventBus.on('CharacterInformationExtended', () => {
    if (commandsFor === Hero.name) return;
    commandsFor = Hero.name;
    commands.clear();
    setServerChatCommands([]);
    Session.sendToGS(ChatCommandListRequestPacket.createPacket().buffer);
  });

  EventBus.on('wsClosed', () => {
    commandsFor = null;
    commands.clear();
    setServerChatCommands([]);
    runInAction(() => {
      ReforgeHud.reset();
      Economy.serverMixRate = null;
    });
  });
}
