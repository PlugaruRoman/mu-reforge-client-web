import { useState, type KeyboardEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { guildMarkDataUrl, isEmptyGuildMark } from '@/core/guildMark';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { playUiSound } from '@/controllers/sound/sfx';
import { Social } from '@/modules/social/social';
import {
  AllianceState,
  GUILD_ALLIANCE_WINDOW,
  GUILD_WARS_WINDOW,
  GuildBrowser,
  WarState,
  actOnGuild,
  actOnTyped,
  answerRequest,
  canDeclare,
  canDeclareOn,
  canInvite,
  canInviteTo,
  matchesFilter,
  matchesNoGuild,
  requestList,
  stopWar,
  type BrowserKind,
  type OnlineGuild,
} from '@/modules/guild_browser';
import { ReforgeShell, RfButton, RfFooter, RfList } from '../_shared/reforgeShell';
import './style.less';

/**
 * The guild browsers of our client (UI/GuildWar/GuildBrowserWindow.cpp, reforge_guild_browser.rml, one
 * document for both): 270 x 424 dp, centred. The banner carries the own war or alliance state and answers
 * an incoming request (or ends a war); the search field filters the list and doubles as the by-name action
 * when it matches no listed guild; every row is a guild online on this game server with its emblem, name,
 * members online and score (or who it is busy with) and its own action plate.
 */

const WIDTH = 270;
const HEIGHT = 424;
/** "Twice a guild name: room for a Cyrillic name typed in full" (`OnBuilt`). */
const FILTER_LENGTH = 16;

/** The plates' art (Data-reforge/Interface, themes/legacy/reforge_guild_browser.rcss). */
const ART = {
  wars: { act: 'newui_guildwars_btn_declare.OZT', accept: 'newui_guildwars_btn_accept.OZT', refuse: 'newui_guildwars_btn_refuse.OZT' },
  alliance: { act: 'newui_guildally_btn_invite.OZT', accept: 'newui_guildally_btn_accept.OZT', refuse: 'newui_guildally_btn_refuse.OZT' },
} as const;
/** The war's Stop plate is the refuse one of either kind (`.gw-stop`). */
const STOP_ART = 'newui_guildwars_btn_refuse.OZT';
const REFRESH_ART = 'newui_btn_refresh.OZT';
/** 34 x 24, the row's own plate and the banner's (`.gw-plate`); the act plates have a pressed frame under. */
const PLATE_W = 34;
const PLATE_H = 24;

const Plate = observer(({ file, pressable, disabled, title, onClick }: { file: string; pressable?: boolean; disabled?: boolean; title: string; onClick: () => void }) => (
  <div className={`gw-plate${disabled ? ' disabled' : ''}`} title={title} data-no-drag="true">
    <MuButton file={file} width={PLATE_W} height={PLATE_H} frames={pressable ? { up: 0, down: 1 } : { up: 0 }} disabled={disabled} onClick={onClick} />
  </div>
));

const isMaster = () => Social.isGuildMaster;

type Banner = { state: string; line1: string; line2: string; showAnswer: boolean; showStop: boolean; stopHint: string };

/** `BuildBanner`: the own state, and whether the master may answer or stop. */
function banner(kind: BrowserKind): Banner {
  const master = isMaster();
  if (kind === 'wars') {
    const wars = GuildBrowser.wars;
    const type = t(wars.soccer ? 'guildBrowser.typeSoccer' : 'guildBrowser.typeWar');
    const name = wars.otherGuild;
    switch (wars.state) {
      case WarState.incoming:
        return { state: 'incoming', line1: t('guildBrowser.warRequest', { name, type }), line2: '', showAnswer: master, showStop: false, stopHint: '' };
      case WarState.sent:
        return { state: 'sent', line1: t('guildBrowser.warSent', { name }), line2: t('guildBrowser.warSentHint'), showAnswer: false, showStop: master, stopHint: t('guildBrowser.withdraw') };
      case WarState.atWar:
        return {
          state: 'war',
          line1: t('guildBrowser.warAtWar', { name, type }),
          line2: t('guildBrowser.score', { own: wars.ownScore, enemy: wars.enemyScore, max: wars.maximumScore }),
          showAnswer: false,
          showStop: master,
          stopHint: t('guildBrowser.surrender'),
        };
      default:
        return { state: 'idle', line1: t('guildBrowser.idle1'), line2: t(master ? 'guildBrowser.warIdle2' : 'guildBrowser.warMasterOnly'), showAnswer: false, showStop: false, stopHint: '' };
    }
  }
  const alliance = GuildBrowser.alliance;
  const name = alliance.otherGuild;
  switch (alliance.state) {
    case AllianceState.incoming:
      return { state: 'incoming', line1: t('guildBrowser.allianceRequest', { name }), line2: '', showAnswer: master, showStop: false, stopHint: '' };
    case AllianceState.inAlliance:
      return {
        state: 'allied',
        line1: t('guildBrowser.allianceMember', { name }),
        line2: t(alliance.isAllianceMaster ? 'guildBrowser.allianceLead' : 'guildBrowser.allianceGuest', { count: alliance.allianceSize }),
        showAnswer: false,
        showStop: false,
        stopHint: '',
      };
    default:
      return { state: 'idle', line1: t('guildBrowser.idle1'), line2: t(master ? 'guildBrowser.allianceIdle2' : 'guildBrowser.allianceMasterOnly'), showAnswer: false, showStop: false, stopHint: '' };
  }
}

/** `RowHint`: members online, then why the plate is (not) live. */
function rowHint(kind: BrowserKind, guild: OnlineGuild): string {
  const members = t('guildBrowser.tipMembers', { count: guild.onlineMembers });
  const reason = !guild.masterOnline
    ? t('guildBrowser.tipMasterOffline')
    : kind === 'wars'
      ? guild.ally
        ? t('guildBrowser.tipAlly')
        : guild.busy
          ? t('guildBrowser.tipInWarWith', { name: guild.otherGuild })
          : t('guildBrowser.tipCanDeclare')
      : guild.busy
        ? guild.otherGuild
          ? t('guildBrowser.tipMemberOf', { name: guild.otherGuild })
          : t('guildBrowser.tipInAlliance')
        : canInvite(GuildBrowser.alliance, isMaster())
          ? t('guildBrowser.tipCanInvite')
          : t('guildBrowser.tipNotMaster');
  return `${members} - ${reason}`;
}

/** `MakeRow`'s "other" column: an ally, or who a busy guild is busy with. */
function rowOther(kind: BrowserKind, guild: OnlineGuild): string {
  if (kind === 'wars' && guild.ally) return t('guildBrowser.tipAlly');
  if (guild.busy && guild.otherGuild) return t(kind === 'wars' ? 'guildBrowser.versus' : 'guildBrowser.allianceOf', { name: guild.otherGuild });
  return '';
}

const canActOn = (kind: BrowserKind, guild: OnlineGuild) =>
  kind === 'wars' ? canDeclareOn(GuildBrowser.wars, guild, isMaster()) : canInviteTo(GuildBrowser.alliance, guild, isMaster());

const GuildRow = observer(({ kind, guild, actHint }: { kind: BrowserKind; guild: OnlineGuild; actHint: string }) => {
  const other = rowOther(kind, guild);
  const ally = kind === 'wars' && guild.ally;
  const busy = guild.busy || !guild.masterOnline;
  const live = canActOn(kind, guild);
  return (
    <div className={`rf-row gw-row${busy ? ' busy' : ''}${ally ? ' ally' : ''}`} title={rowHint(kind, guild)}>
      <span className="gw-mark">{!isEmptyGuildMark(guild.mark) && <img src={guildMarkDataUrl(guild.mark)} alt="" />}</span>
      <span className="gw-name">{guild.name}</span>
      {other ? (
        <span className="gw-other">{other}</span>
      ) : (
        <>
          <span className="gw-online">{guild.onlineMembers}</span>
          <span className="gw-score">{guild.score}</span>
        </>
      )}
      <Plate file={ART[kind].act} pressable disabled={!live} title={actHint} onClick={() => actOnGuild(kind, guild)} />
    </div>
  );
});

const BrowserBody = observer(({ kind }: { kind: BrowserKind }) => {
  const [filter, setFilter] = useState('');
  const master = isMaster();
  const guilds = kind === 'wars' ? GuildBrowser.wars.guilds : GuildBrowser.alliance.guilds;
  const shown = guilds.filter(g => matchesFilter(g.name, filter));
  const typed = filter.trim();
  const canTyped =
    (kind === 'wars' ? canDeclare(GuildBrowser.wars, master) : canInvite(GuildBrowser.alliance, master)) && matchesNoGuild(guilds, typed);
  const state = banner(kind);
  const art = ART[kind];
  const actHint = t(kind === 'wars' ? 'guildBrowser.declare' : 'guildBrowser.invite');

  // The typed name (`ActOnTyped`); the button plays its own click, Enter plays one here.
  const actTyped = (): boolean => {
    if (!canTyped || !actOnTyped(kind, typed)) return false;
    setFilter('');
    (document.activeElement as HTMLElement | null)?.blur?.();
    return true;
  };

  // Enter acts on the typed name; Escape leaves the field first, so a master typing a name keeps the window.
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (actTyped()) playUiSound('click');
    } else if (e.key === 'Escape') e.currentTarget.blur();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const footer =
    guilds.length === 0
      ? t('guildBrowser.empty')
      : shown.length === 0
        ? t('guildBrowser.noMatch')
        : filter
          ? t('guildBrowser.countFiltered', { shown: shown.length, total: guilds.length })
          : t('guildBrowser.count', { count: guilds.length });

  return (
    <>
      <div className={`gw-banner state-${state.state}`}>
        <div className="gw-banner-text">
          <div className="gw-banner-line1">{state.line1}</div>
          <div className="gw-banner-line2">{state.line2}</div>
        </div>
        {state.showAnswer && (
          <>
            <Plate file={art.accept} title={t('guildBrowser.accept')} onClick={() => answerRequest(kind, true)} />
            <Plate file={art.refuse} title={t('guildBrowser.refuse')} onClick={() => answerRequest(kind, false)} />
          </>
        )}
        {state.showStop && <Plate file={STOP_ART} title={state.stopHint} onClick={() => stopWar()} />}
      </div>

      <div className="gw-search-row">
        <input
          className="acct-field gw-search"
          data-no-drag="true"
          maxLength={FILTER_LENGTH}
          placeholder={t('guildBrowser.search')}
          value={filter}
          onChange={e => setFilter(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="gw-refresh" title={t('guildBrowser.refresh')} data-no-drag="true">
          <MuButton file={REFRESH_ART} width={36} height={29} frames={{ up: 0 }} onClick={() => requestList(kind)} />
        </div>
      </div>

      <div className="rf-table-head gw-head">
        <span className="gw-mark" />
        <span className="gw-name">{t('guildBrowser.columnGuild')}</span>
        <span className="gw-online">{t('guildBrowser.columnOnline')}</span>
        <span className="gw-score">{t('guildBrowser.columnScore')}</span>
        <span className="gw-action-gap" />
      </div>

      <RfList className="gw-list" height={220}>
        {shown.map(guild => (
          <GuildRow key={guild.name} kind={kind} guild={guild} actHint={actHint} />
        ))}
      </RfList>

      {canTyped ? (
        <RfButton
          className="gw-typed"
          width="100%"
          label={t(kind === 'wars' ? 'guildBrowser.challenge' : 'guildBrowser.inviteName', { name: typed })}
          onClick={() => void actTyped()}
        />
      ) : (
        <RfFooter className="gw-footer">{footer}</RfFooter>
      )}
    </>
  );
});

const GuildBrowserWindow = observer(({ kind }: { kind: BrowserKind }) => (
  <ReforgeShell
    id={kind === 'wars' ? GUILD_WARS_WINDOW : GUILD_ALLIANCE_WINDOW}
    title={t(kind === 'wars' ? 'guildBrowser.warsTitle' : 'guildBrowser.allianceTitle')}
    width={WIDTH}
    height={HEIGHT}
    className={`gw-shell kind-${kind}`}
  >
    <BrowserBody kind={kind} />
  </ReforgeShell>
));

export const GuildWarsWindow = observer(() => <GuildBrowserWindow kind="wars" />);
export const GuildAllianceWindow = observer(() => <GuildBrowserWindow kind="alliance" />);
