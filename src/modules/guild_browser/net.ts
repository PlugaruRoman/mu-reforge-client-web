import { reaction, runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { MuWindows } from '@/controllers/interface/windowManager';
import {
  GuildRelationshipChangeResponsePacket,
  GuildRelationshipTypeEnum,
  GuildRequestTypeEnum,
  GuildWarResponsePacket,
} from '@versions/shared/packets/ClientToServerPackets';
import { Hero } from '../hero';
import { Session } from '../session';
import { Social } from '../social/social';
import {
  AllianceState,
  GuildBrowser,
  WarState,
  buildAllianceListRequest,
  buildAllianceRequest,
  buildChatCommand,
  buildWarListRequest,
  canDeclare,
  canDeclareOn,
  canInvite,
  canInviteTo,
  canStop,
  forgetGuildBrowser,
  parseAllianceList,
  parseAllianceRequest,
  parseWarList,
  setAllianceList,
  setWarList,
  type BrowserKind,
  type OnlineGuild,
} from './state';

/** The windows (`versions/shared/ui/windows/guild_browser`), toggled by the guild window's plates. */
export const GUILD_WARS_WINDOW = 'guild_wars';
export const GUILD_ALLIANCE_WINDOW = 'guild_alliance';
const WINDOW: Record<BrowserKind, string> = { wars: GUILD_WARS_WINDOW, alliance: GUILD_ALLIANCE_WINDOW };

/** The list is asked for again on this interval while its window is open (GuildBrowserWindow.cpp `AutoRefreshMs`). */
export const AUTO_REFRESH_MS = 15000;
/**
 * After an action the next list is asked for this soon: the server answers the action first, so a list
 * asked for at once can still carry the state from before it (`QuickRefreshMs`).
 */
export const QUICK_REFRESH_MS = 1500;

const send = (frame: DataView): boolean => {
  if (Session.isOffline) return false;
  Session.sendToGS(frame);
  return true;
};

const isMaster = () => Social.isGuildMaster;

const timers: Record<BrowserKind, ReturnType<typeof setTimeout> | null> = { wars: null, alliance: null };

function schedule(kind: BrowserKind, ms: number): void {
  const pending = timers[kind];
  if (pending) clearTimeout(pending);
  timers[kind] = setTimeout(() => {
    timers[kind] = null;
    if (MuWindows.isOpen(WINDOW[kind])) requestList(kind);
  }, ms);
}

function stopTimer(kind: BrowserKind): void {
  const pending = timers[kind];
  if (pending) clearTimeout(pending);
  timers[kind] = null;
}

/** DC 10 / DC 12, and the next one in 15 s while the window stays open (`RequestList`). */
export function requestList(kind: BrowserKind): void {
  send(kind === 'wars' ? buildWarListRequest() : buildAllianceListRequest());
  schedule(kind, AUTO_REFRESH_MS);
}

/** The next list in 1.5 s (`RequestSoon`). */
function requestSoon(kind: BrowserKind): void {
  if (MuWindows.isOpen(WINDOW[kind])) schedule(kind, QUICK_REFRESH_MS);
}

/** "/war <guild>": the server parks a challenge for a guild with nobody online until its master logs in. */
function declareWar(guildName: string): void {
  if (!send(buildChatCommand(Hero.name, `/war ${guildName}`))) return;
  // Waiting right away: until the next list arrives every row would still look clickable, and a second
  // declaration is what the server refuses ("your request is refused").
  setWarList({ ...GuildBrowser.wars, state: WarState.sent, otherGuild: guildName });
  requestSoon('wars');
}

/** DC 11: asks the named guild's master into the alliance. */
function inviteToAlliance(guildName: string): void {
  if (!send(buildAllianceRequest(guildName))) return;
  requestSoon('alliance');
}

/** A row's action plate: declare war on it, or invite it (`ActOnRow`). False when the rules refuse it. */
export function actOnGuild(kind: BrowserKind, guild: OnlineGuild): boolean {
  if (kind === 'wars') {
    if (!canDeclareOn(GuildBrowser.wars, guild, isMaster())) return false;
    declareWar(guild.name);
  } else {
    if (!canInviteTo(GuildBrowser.alliance, guild, isMaster())) return false;
    inviteToAlliance(guild.name);
  }
  return true;
}

/** The typed name the list does not hold (`ActOnTyped`); the window checks it matches no listed guild. */
export function actOnTyped(kind: BrowserKind, typed: string): boolean {
  const name = typed.trim();
  if (!name) return false;
  if (kind === 'wars') {
    if (!canDeclare(GuildBrowser.wars, isMaster())) return false;
    declareWar(name);
  } else {
    if (!canInvite(GuildBrowser.alliance, isMaster())) return false;
    inviteToAlliance(name);
  }
  return true;
}

/**
 * The banner's Accept / Refuse (`Answer`): the stock answers, 0x61 to a war challenge and 0xE6 to an
 * alliance request. A popup still up for the same request (`Social`) goes with it.
 */
export function answerRequest(kind: BrowserKind, accept: boolean): boolean {
  if (!isMaster()) return false;
  if (kind === 'wars') {
    if (GuildBrowser.wars.state !== WarState.incoming) return false;
    if (Social.guildWarRequest) {
      Social.guildWarRespond(accept);
    } else {
      const packet = GuildWarResponsePacket.createPacket();
      packet.Accepted = accept;
      send(packet.buffer);
    }
    setWarList({ ...GuildBrowser.wars, state: WarState.none });
  } else {
    if (GuildBrowser.alliance.state !== AllianceState.incoming) return false;
    const popup = Social.guildRelationRequest;
    if (popup && popup.relationship === GuildRelationshipTypeEnum.Alliance && popup.join) {
      Social.guildRelationRespond(accept);
    } else {
      // The by-name request carries no player: the server answers through the request it keeps.
      sendAllianceAnswer(accept);
    }
    setAllianceList({ ...GuildBrowser.alliance, state: AllianceState.none });
  }
  requestSoon(kind);
  return true;
}

function sendAllianceAnswer(accept: boolean): void {
  const packet = GuildRelationshipChangeResponsePacket.createPacket();
  packet.RelationshipType = GuildRelationshipTypeEnum.Alliance;
  packet.RequestType = GuildRequestTypeEnum.Join;
  packet.Response = accept;
  packet.TargetPlayerId = 0;
  send(packet.buffer);
}

/** "/warstop": one command withdraws a challenge, cancels a request or surrenders (`Stop`). */
export function stopWar(): boolean {
  if (!canStop(GuildBrowser.wars, isMaster())) return false;
  if (!send(buildChatCommand(Hero.name, '/warstop'))) return false;
  setWarList({ ...GuildBrowser.wars, state: WarState.none, otherGuild: '' });
  requestSoon('wars');
  return true;
}

/** Registers the listeners; the module's `install` calls it. */
export function installNet(): void {
  EventBus.on('GuildWarList', view => {
    const list = parseWarList(view);
    if (list) setWarList(list);
  });
  EventBus.on('GuildAllianceList', view => {
    const list = parseAllianceList(view);
    if (list) setAllianceList(list);
  });

  // DC 11, the alliance request by guild name (UI/Reforge/ReforgeGuildUpdates.cpp `AllianceRequestedByName`):
  // the classic yes/no box asks it (`social_prompts`), its answer the stock 0xE6 with no player id. A
  // request arriving while another alliance or hostility question is up is refused, as our client does.
  EventBus.on('GuildAllianceRequestByName', view => {
    const guildName = parseAllianceRequest(view);
    if (!guildName) return;
    if (Social.guildRelationRequest) {
      sendAllianceAnswer(false);
      return;
    }
    runInAction(() => {
      Social.guildRelationRequest = { senderId: 0, senderName: guildName, relationship: GuildRelationshipTypeEnum.Alliance, join: true };
    });
    requestSoon('alliance');
  });

  // The stock war and alliance answers change what the lists show: ask again soon rather than in 15 s.
  for (const name of ['GuildWarRequest', 'GuildWarRequestResult', 'GuildWarDeclared', 'GuildWarEnded'] as const) {
    EventBus.on(name, () => requestSoon('wars'));
  }
  for (const name of ['GuildRelationshipRequest', 'GuildRelationshipChangeResult'] as const) {
    EventBus.on(name, () => requestSoon('alliance'));
  }

  // Opening a window asks for its list (`Show`); closing it stops the refresh.
  for (const kind of ['wars', 'alliance'] as const) {
    reaction(
      () => MuWindows.isOpen(WINDOW[kind]),
      shown => (shown ? requestList(kind) : stopTimer(kind))
    );
  }

  // The hero left the guild while a window was open (`Update`).
  reaction(
    () => !!Social.myGuild,
    inGuild => {
      if (inGuild) return;
      runInAction(() => {
        MuWindows.setOpen(GUILD_WARS_WINDOW, false);
        MuWindows.setOpen(GUILD_ALLIANCE_WINDOW, false);
      });
    }
  );

  EventBus.on('wsClosed', () => {
    stopTimer('wars');
    stopTimer('alliance');
    forgetGuildBrowser();
  });
}
