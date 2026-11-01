import './style.less';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { playUiSound } from '@/controllers/sound/sfx';
import { mapName } from '@/modules/gm/gmMaps';
import { Social } from '@/modules/social/social';
import {
  CLASS_COUNT,
  DEFAULT_LEVEL_GAP,
  JoinResult,
  MAX_LEVEL_CAP,
  ONLY_ALLIANCE_FLAG,
  ONLY_GUILD_FLAG,
  ONLY_ONE_CLASS_FLAG,
  PARTY_SEARCH_WINDOW,
  PASSWORD_LENGTH,
  PartySearch,
  PartySearchTab,
  allowsEveryClass,
  countClasses,
  isFull,
  type RestrictionOption,
} from '@/modules/party_search';
import { ReforgeShell, RfButton, RfButtons, RfList, RfTableHead, RfTabs, columnStyle, type RfColumn } from '../_shared/reforgeShell';

/**
 * `CPartySearchWindow` (UI/PartySearch/PartySearchWindow.cpp, reforge_party_search.rml, 270 x 404 dp):
 * Find lists the parties looking for members, refreshed every 4 s, with a Join per row and the
 * password the join sends; Settings (Create without a party) is the listing of the player's party,
 * saved with Save, and the auto-accept preference, sent on its own click. Opened from the party
 * window's Find / Settings, P without a party and the N menu.
 */

const WIDTH = 270;
const HEIGHT = 404;
/** reforge_party_search.rcss: the list (nine rows of 18) and the columns after the name. */
const LIST_HEIGHT = 164;
const MAP_WIDTH = 76;
const MEMBERS_WIDTH = 38;
const JOIN_WIDTH = 38;
const POLL_MS = 500;

const JOIN_FAILURES: Partial<Record<JoinResult, TextKey>> = {
  [JoinResult.NotFound]: 'partySearch.fail.notFound',
  [JoinResult.WrongPassword]: 'partySearch.fail.wrongPassword',
  [JoinResult.PartyFull]: 'partySearch.fail.full',
  [JoinResult.LevelTooHigh]: 'partySearch.fail.levelTooHigh',
  [JoinResult.ClassNotAllowed]: 'partySearch.fail.classNotAllowed',
  [JoinResult.GuildOnly]: 'partySearch.fail.guildOnly',
  [JoinResult.AllianceOnly]: 'partySearch.fail.allianceOnly',
  [JoinResult.DuplicateClass]: 'partySearch.fail.duplicateClass',
  [JoinResult.AlreadyInParty]: 'partySearch.fail.alreadyInParty',
};

/** The window's short reason; the server sends the same with its numbers as a message. */
function failureText(result: JoinResult): string {
  if (result === JoinResult.LevelGapTooBig) return t('partySearch.fail.levelGap', { gap: DEFAULT_LEVEL_GAP });
  const key = JOIN_FAILURES[result];
  return key ? t(key) : t('partySearch.fail.error');
}

const CLASS_KEYS: readonly TextKey[] = Array.from({ length: CLASS_COUNT }, (_, i) => `partySearch.class.${i}` as TextKey);

const Field = observer(({ value, onChange }: { value: string; onChange: (text: string) => void }) => (
  <input
    className="acct-field ps-field"
    data-no-drag="true"
    type="text"
    maxLength={PASSWORD_LENGTH}
    spellCheck={false}
    autoComplete="off"
    value={value}
    onChange={e => onChange(e.target.value)}
  />
));

/** A whole row toggles; its label lights while the option is on. */
const Toggle = observer(({ label, on, onClick, className }: { label: string; on: boolean; onClick: () => void; className?: string }) => (
  <div
    className={`ps-toggle${on ? ' on' : ''}${className ? ` ${className}` : ''}`}
    onClick={() => {
      playUiSound('click');
      onClick();
    }}
  >
    <span className="ps-toggle-label">{label}</span>
    <span className={`acct-check${on ? ' checked' : ''}`}>
      <span className="acct-box" />
    </span>
  </div>
));

/** The maximum level stepper's [-10] / [+10]. */
const Step = observer(({ steps, label }: { steps: number; label: string }) => (
  <span
    className="ps-step"
    onClick={() => {
      playUiSound('click');
      PartySearch.stepLevel(steps);
    }}
  >
    {label}
  </span>
));

const Section = observer(({ title, hint, warning }: { title: string; hint?: string; warning?: boolean }) => (
  <div className="ps-section">
    <span className="ps-section-title">{title}</span>
    {hint && <span className={`ps-section-hint${warning ? ' warning' : ''}`}>{hint}</span>}
  </div>
));

const FindPage = observer(() => {
  const failure = PartySearch.joinFailure;
  const columns: RfColumn[] = [
    { label: t('partySearch.column.name') },
    { label: t('partySearch.column.map'), width: MAP_WIDTH },
    { label: t('partySearch.column.members'), width: MEMBERS_WIDTH, align: 'center' },
    { label: t('partySearch.join'), width: JOIN_WIDTH, align: 'center' },
  ];
  return (
    <div className="ps-page">
      <div className="ps-line">
        <span className="ps-line-label">{t('partySearch.myParty')}</span>
        <span className={`ps-line-value${PartySearch.listed ? ' listed' : ''}`}>
          {PartySearch.listed ? t('partySearch.listed') : t('partySearch.notListed')}
        </span>
      </div>
      <div className={`ps-found${failure ? ' failed' : ''}`}>
        {failure ? failureText(failure.result) : t('partySearch.found', { count: PartySearch.parties.length })}
      </div>
      <RfTableHead className="ps-columns" columns={columns} />
      <RfList height={LIST_HEIGHT} className="ps-list">
        {PartySearch.parties.length === 0 && (
          <div className="ps-empty">
            <div>{t('partySearch.empty')}</div>
            <div className="ps-empty-hint">{t('partySearch.autoRefresh')}</div>
          </div>
        )}
        {PartySearch.parties.map((party, i) => (
          <div
            key={`${party.masterName}-${i}`}
            className={`rf-row ps-row${party.hasPassword ? ' locked' : ''}${isFull(party) ? ' full' : ''}`}
            title={party.hasPassword ? t('partySearch.locked') : undefined}
          >
            <span className="ps-name" style={columnStyle(columns[0])}>
              {party.masterName}
            </span>
            <span className="ps-map" style={columnStyle(columns[1])}>
              {mapName(party.mapId)}
            </span>
            <span className="ps-members" style={columnStyle(columns[2])}>
              {party.memberCount}/{party.maxMembers}
            </span>
            <span className="ps-join-cell" style={columnStyle(columns[3])}>
              <span
                className="ps-join"
                onClick={() => {
                  playUiSound('click');
                  PartySearch.join(i);
                }}
              >
                {t('partySearch.join')}
              </span>
            </span>
          </div>
        ))}
      </RfList>
      <div className="ps-field-row">
        <span className="ps-field-label">{t('partySearch.password')}</span>
        <Field value={PartySearch.joinPassword} onChange={text => PartySearch.setJoinPassword(text)} />
      </div>
      <div className="ps-hint">{t('partySearch.levelGapHint', { gap: DEFAULT_LEVEL_GAP })}</div>
      <RfButtons className="ps-buttons">
        <RfButton small label={t('partySearch.refresh')} onClick={() => PartySearch.requestList()} />
        <RfButton small label={t('common.close')} onClick={() => PartySearch.close()} />
      </RfButtons>
    </div>
  );
});

const SettingsPage = observer(() => {
  const s = PartySearch.settings;
  const masterOnly = PartySearch.masterOnly;
  const toggle = (option: RestrictionOption) => () => PartySearch.toggleOption(option);
  const classesHint = allowsEveryClass(s.classMask)
    ? t('partySearch.anyClass')
    : t('partySearch.selectedOf', { count: countClasses(s.classMask), total: CLASS_COUNT });
  return (
    <div className="ps-page">
      <Section title={t('partySearch.advertisement')} hint={masterOnly ? t('partySearch.masterOnly') : undefined} warning />
      <Toggle label={t('partySearch.listMyParty')} on={s.active} onClick={toggle('active')} />
      <div className="ps-field-row">
        <span className="ps-field-label">{t('partySearch.maxLevel')}</span>
        <Step steps={-1} label="-10" />
        <span className="ps-level">{s.maxLevel >= MAX_LEVEL_CAP ? t('partySearch.anyLevel') : s.maxLevel}</span>
        <Step steps={1} label="+10" />
      </div>
      <div className="ps-field-row">
        <span className="ps-field-label">{t('partySearch.password')}</span>
        <Field value={s.password} onChange={text => PartySearch.setListingPassword(text)} />
      </div>
      <Toggle label={t('partySearch.autoAccept')} on={PartySearch.autoAccept} onClick={toggle('auto_accept')} />

      <Section title={t('partySearch.restrictions')} />
      <Toggle label={t('partySearch.onlyGuild')} on={(s.flags & ONLY_GUILD_FLAG) !== 0} onClick={toggle('guild')} />
      <Toggle label={t('partySearch.onlyAlliance')} on={(s.flags & ONLY_ALLIANCE_FLAG) !== 0} onClick={toggle('alliance')} />
      <Toggle label={t('partySearch.onePerClass')} on={(s.flags & ONLY_ONE_CLASS_FLAG) !== 0} onClick={toggle('one_class')} />

      <Section title={t('partySearch.allowedClasses')} hint={classesHint} />
      <div className="ps-classes">
        {CLASS_KEYS.map((key, i) => {
          const on = (s.classMask & (1 << i)) !== 0;
          return (
            <div
              key={i}
              className={`ps-class${on ? ' on' : ''}`}
              onClick={() => {
                playUiSound('click');
                PartySearch.toggleClass(i);
              }}
            >
              <span className={`acct-check${on ? ' checked' : ''}`}>
                <span className="acct-box" />
              </span>
              <span className="ps-class-label">{t(key)}</span>
            </div>
          );
        })}
      </div>

      <RfButtons className="ps-buttons">
        <RfButton
          small
          label={t('partySearch.save')}
          disabled={masterOnly}
          title={masterOnly ? t('partySearch.masterOnly') : undefined}
          onClick={() => PartySearch.save()}
        />
        <RfButton small label={t('common.close')} onClick={() => PartySearch.close()} />
      </RfButtons>
    </div>
  );
});

export const PartySearchWindow = observer(() => {
  const open = MuWindows.isOpen(PARTY_SEARCH_WINDOW);

  // The list and the listing are asked for again on every opening: they may have changed.
  useEffect(() => {
    if (!open) return;
    PartySearch.opened();
    const timer = setInterval(() => PartySearch.poll(), POLL_MS);
    return () => clearInterval(timer);
  }, [open]);

  const tabs = [
    { id: PartySearchTab.Find, label: t('partySearch.find') },
    { id: PartySearchTab.Settings, label: Social.inParty ? t('partySearch.settings') : t('partySearch.create') },
  ];

  return (
    <ReforgeShell
      id={PARTY_SEARCH_WINDOW}
      title={t('partySearch.title')}
      width={WIDTH}
      height={HEIGHT}
      closeButton={false}
      className="party-search"
    >
      <RfTabs tabs={tabs} active={PartySearch.tab} onSelect={tab => PartySearch.selectTab(tab)} />
      {PartySearch.tab === PartySearchTab.Find ? <FindPage /> : <SettingsPage />}
    </ReforgeShell>
  );
});
