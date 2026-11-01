import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import { togglesWindow } from '@/controllers/interface/components/module_window';
import { useEventBus } from '@/controllers/interface/hooks';
import { guildMarkDataUrl, packGuildMark } from '@/core/guildMark';
import { itemLevelName } from '@/controllers/item_rules';
import { playUiSound } from '@/controllers/sound/sfx';
import {
  DEATH_RECORDS_WINDOW,
  HERO,
  HERO_QUALIFIED,
  NO_ANSWER_MS,
  NO_END,
  OLYMPIAD_WINDOW,
  Olympiad,
  holdsRewardWeapon,
  pageCount,
  watchMatchesPerPage,
  winRatePercent,
  type DeathRecord,
  type OlympiadBoard,
} from '@/modules/olympiad';
import { ReforgeShell, RfButton, RfFooter, RfList, RfTableHead, columnStyle } from '../_shared/reforgeShell';

/**
 * The Battle Statue window (our client's UI/Olympiad/OlympiadWindow.cpp, reforge_olympiad.rml) and
 * the Death Records (UI/DeathRecords/DeathRecordsWindow.cpp). The statue opens it on a click
 * (NPC 650); everything shows the server's board (C2 EE 01), asked for on opening and after every
 * action. The Death Records open with their key (Y in our client).
 */

/** reforge_olympiad.rcss `tone-N`. */
const TONE = {
  normal: '#e6e2c8',
  good: '#96eb96',
  gold: '#ffcd3c',
  warn: '#ffaa6e',
  bad: '#ff7864',
  muted: '#a0a0aa',
} as const;
type Tone = keyof typeof TONE;

type Page = 'main' | 'watch' | 'hero' | 'reward' | 'heroes' | 'tokens' | 'shop0' | 'shop1' | 'info' | 'infoText';
type Button = { label: string; onClick: () => void; enabled?: boolean; wide?: boolean };
type Row = { label: string; value: string; tone?: Tone };
type Line = { text: string; tone?: Tone };

const CLASS_KEYS: readonly TextKey[] = [
  'olympiad.class.wizard',
  'olympiad.class.knight',
  'olympiad.class.elf',
  'olympiad.class.gladiator',
  'olympiad.class.lord',
  'olympiad.class.summoner',
  'olympiad.class.fighter',
];
const CLASS_SHORT_KEYS: readonly TextKey[] = [
  'olympiad.classShort.wizard',
  'olympiad.classShort.knight',
  'olympiad.classShort.elf',
  'olympiad.classShort.gladiator',
  'olympiad.classShort.lord',
  'olympiad.classShort.summoner',
  'olympiad.classShort.fighter',
];
const INFO_TOPICS: readonly [TextKey, TextKey][] = [
  ['olympiad.info.aboutTitle', 'olympiad.info.aboutText'],
  ['olympiad.info.rulesTitle', 'olympiad.info.rulesText'],
  ['olympiad.info.pointsTitle', 'olympiad.info.pointsText'],
  ['olympiad.info.heroesTitle', 'olympiad.info.heroesText'],
];
/** `HeroesPerPage`; the shop's rows a page (`ShopRowsWithoutPages` / `ShopRowsWithPages`). */
const HEROES_PER_PAGE = 12;
const SHOP_ROWS = { flat: 12, paged: 11 } as const;

const className = (i: number) => (CLASS_KEYS[i] ? t(CLASS_KEYS[i]) : '?');
const classShort = (i: number) => (CLASS_SHORT_KEYS[i] ? t(CLASS_SHORT_KEYS[i]) : '?');

/** `Duration`: days and hours, hours and minutes, or minutes. */
function duration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return t('olympiad.durationDays', { d, h });
  if (h > 0) return t('olympiad.durationHours', { h, m });
  return t('olympiad.durationMinutes', { m });
}

/** Re-renders every `ms` while mounted (the window's clocks). */
function useTick(ms: number): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const Lines = observer(({ lines }: { lines: Line[] }) => (
  <>
    {lines.map((l, i) => (
      <div key={i} className="ol-line" style={{ color: TONE[l.tone ?? 'normal'] }}>
        {l.text}
      </div>
    ))}
  </>
));

const Panel = observer(({ title, rows }: { title?: string; rows: Row[] }) =>
  rows.length === 0 ? null : (
    <div className="ol-panel">
      {title && <div className="ol-panel-title">{title}</div>}
      {rows.map((r, i) => (
        <div key={i} className="ol-row">
          <span className="ol-label">{r.label}</span>
          <span className="ol-value" style={{ color: TONE[r.tone ?? 'normal'] }}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  ));

/** The page's buttons (reforge_olympiad.rcss `.ol-btn`): two in a row, or one wide (96%). */
const Buttons = observer(({ buttons }: { buttons: Button[] }) => (
  <div className="ol-buttons">
    {buttons.map((b, i) => (
      <RfButton key={i} className={`ol-btn${b.wide ? ' wide' : ''}`} label={b.label} disabled={b.enabled === false} onClick={b.onClick} />
    ))}
  </div>
));

/** The Prev / Next row of a paged list (`AddPageButtons`). */
function pageButtons(page: number, pages: number, go: (p: number) => void): Button[] {
  if (pages <= 1) return [];
  return [
    { label: t('olympiad.prev'), onClick: () => go(page - 1), enabled: page > 0 },
    { label: t('olympiad.next'), onClick: () => go(page + 1), enabled: page < pages - 1 },
  ];
}

const OlympiadWindow = observer(() => {
  const now = useTick(1000);
  const [page, setPage] = useState<Page>('main');
  const [listPage, setListPage] = useState(0);
  const [topic, setTopic] = useState(0);
  const board = Olympiad.board;
  const close = () => MuWindows.setOpen(OLYMPIAD_WINDOW, false);
  const go = (p: Page) => {
    setPage(p);
    setListPage(0);
    if (p === 'watch') Olympiad.requestBoard();
  };
  // A fresh opening starts on the main page.
  const statueId = Olympiad.statueId;
  useEffect(() => setPage('main'), [statueId]);

  let title = t('olympiad.title');
  let status: Line[] = [];
  let panelTitle: string | undefined;
  let rows: Row[] = [];
  let text: Line[] = [];
  let footer: Line[] = [];
  let buttons: Button[] = [];
  let heroes: OlympiadBoard['heroes'] = [];
  let shop: { name: string; price: number; index: number; affordable: boolean; line: OlympiadBoard['shop'][number] }[] | null = null;

  const back = (to: Page): Button => ({ label: t('olympiad.back'), onClick: () => go(to) });
  const left = (seconds: number) => Math.max(0, seconds - Math.floor((now - Olympiad.receivedAt) / 1000));

  if (!board) {
    const noAnswer = now - Olympiad.askedAt > NO_ANSWER_MS;
    status = [{ text: t(noAnswer ? 'olympiad.notAvailable' : 'olympiad.loading'), tone: noAnswer ? 'bad' : 'normal' }];
    if (noAnswer) text = [{ text: t('olympiad.switchedOff'), tone: 'muted' }];
    buttons = [{ label: t('olympiad.close'), onClick: close, wide: true }];
  } else if (page === 'main') {
    const b = board;
    status = [
      b.isOpen
        ? { text: t('olympiad.battlesOpen'), tone: 'good' }
        : b.battleServer > 0
          ? { text: t('olympiad.battlesOnServer', { server: b.battleServer }), tone: 'gold' }
          : { text: t('olympiad.nextBattles', { time: duration(left(b.secondsToNextWindow)) }), tone: 'gold' },
      b.isInMatch || b.isQueued
        ? { text: t(b.isInMatch ? 'olympiad.inMatch' : 'olympiad.waiting'), tone: 'good' }
        : { text: t('olympiad.requirement', { level: b.minimumLevel, resets: b.minimumResets }), tone: 'warn' },
    ];
    panelTitle = t('olympiad.yourWeek');
    rows = [
      { label: t('olympiad.class'), value: className(b.classIndex) },
      { label: t('olympiad.points'), value: String(b.points), tone: 'gold' },
      { label: t('olympiad.rank'), value: b.rank > 0 ? String(b.rank) : '-', tone: 'gold' },
      { label: t('olympiad.record'), value: t('olympiad.recordValue', { wins: b.wins, losses: b.losses, draws: b.draws }) },
      {
        label: t('olympiad.matchesToday'),
        value: `${b.matchesToday} / ${b.maximumPerDay}`,
        tone: b.matchesToday >= b.maximumPerDay ? 'bad' : 'normal',
      },
      {
        label: t('olympiad.forHero'),
        value: `${b.weekMatches} / ${b.minimumMatchesForHero}`,
        tone: b.weekMatches >= b.minimumMatchesForHero ? 'good' : 'normal',
      },
      { label: t('olympiad.tokens'), value: String(b.tokens), tone: 'gold' },
    ];
    buttons = [
      b.isQueued
        ? { label: t('olympiad.leaveQueue'), onClick: () => Olympiad.leave() }
        : { label: t('olympiad.joinMatch'), onClick: () => Olympiad.join(), enabled: b.isOpen && !b.isInMatch },
      { label: t('olympiad.watchMatch'), onClick: () => go('watch') },
      { label: t('olympiad.hero'), onClick: () => go('hero') },
      { label: t('olympiad.rewards'), onClick: () => go('tokens') },
      { label: t('olympiad.information'), onClick: () => go('info') },
      { label: t('olympiad.close'), onClick: close },
    ];
  } else if (page === 'watch') {
    title = t('olympiad.titleWatch');
    const count = board.matches.length;
    const perPage = watchMatchesPerPage(count);
    const pages = pageCount(count, perPage);
    const p = Math.min(listPage, pages - 1);
    text =
      count === 0
        ? [{ text: t('olympiad.noMatch') }]
        : [{ text: t('olympiad.chooseMatch') }, { text: t('olympiad.unseen'), tone: 'muted' }];
    if (pages > 1) text.push({ text: t('olympiad.page', { page: p + 1, pages }), tone: 'muted' });
    buttons = [
      ...board.matches.slice(p * perPage, (p + 1) * perPage).map(m => ({
        label: t('olympiad.matchVs', { first: m.first, second: m.second }),
        onClick: () => Olympiad.watch(m.room),
        wide: true,
      })),
      ...pageButtons(p, pages, setListPage),
      { label: t('olympiad.refresh'), onClick: () => Olympiad.requestBoard() },
      back('main'),
    ];
  } else if (page === 'hero') {
    title = t('olympiad.titleHero');
    text = [{ text: t('olympiad.statueEtched') }];
    panelTitle = t('olympiad.heroStatus');
    const cls = className(board.classIndex);
    if (board.heroState === HERO) {
      const time = board.heroSecondsLeft === NO_END ? t('olympiad.noEnd') : duration(left(board.heroSecondsLeft));
      rows = [
        { label: t('olympiad.status'), value: t('olympiad.statusHero'), tone: 'gold' },
        { label: t('olympiad.class'), value: cls },
        { label: t('olympiad.timeLeft'), value: time },
      ];
    } else if (board.heroState === HERO_QUALIFIED) {
      rows = [
        { label: t('olympiad.status'), value: t('olympiad.statusWinner'), tone: 'good' },
        { label: t('olympiad.class'), value: cls },
      ];
      footer = [{ text: t('olympiad.takeStatus'), tone: 'good' }];
    } else {
      rows = [
        { label: t('olympiad.status'), value: t('olympiad.notQualified'), tone: 'warn' },
        { label: t('olympiad.class'), value: cls },
        { label: t('olympiad.matchesForHero'), value: `${board.weekMatches} / ${board.minimumMatchesForHero}` },
      ];
    }
    buttons = [
      { label: t('olympiad.certify'), onClick: () => Olympiad.certify(), enabled: board.heroState === HERO_QUALIFIED },
      { label: t('olympiad.receiveReward'), onClick: () => go('reward'), enabled: board.heroState === HERO },
      { label: t('olympiad.heroList'), onClick: () => go('heroes') },
      back('main'),
    ];
  } else if (page === 'reward') {
    title = t('olympiad.titleReward');
    text = [{ text: t('olympiad.rewardInfo') }, { text: t('olympiad.rewardExchangeInfo'), tone: 'muted' }];
    const holds = holdsRewardWeapon(board);
    buttons = [
      ...board.rewards.slice(0, 7).map((r, i) => {
        const name = itemLevelName(r.group, r.number, 0);
        if (r.isHeld) return { label: t('olympiad.rewardYours', { name }), onClick: () => {}, enabled: false, wide: true };
        const key: TextKey = !r.isWing && holds ? 'olympiad.rewardExchange' : 'olympiad.rewardReceive';
        return { label: t(key, { name }), onClick: () => Olympiad.reward(i), wide: true };
      }),
      back('hero'),
    ];
  } else if (page === 'heroes') {
    title = t('olympiad.titleHeroes');
    const pages = pageCount(board.heroes.length, HEROES_PER_PAGE);
    const p = Math.min(listPage, pages - 1);
    heroes = board.heroes.slice(p * HEROES_PER_PAGE, (p + 1) * HEROES_PER_PAGE);
    if (board.heroes.length === 0) footer.push({ text: t('olympiad.noHeroes') });
    footer.push({ text: t('olympiad.notCertified'), tone: 'muted' });
    buttons = [...pageButtons(p, pages, setListPage), back('hero')];
  } else if (page === 'tokens') {
    title = t('olympiad.titleTokens');
    panelTitle = t('olympiad.tokens');
    rows = [
      { label: t('olympiad.yourTokens'), value: String(board.tokens), tone: 'gold' },
      board.claimableTokens > 0
        ? { label: t('olympiad.lastWeek'), value: `+${board.claimableTokens}`, tone: 'good' }
        : { label: t('olympiad.lastWeek'), value: t('olympiad.nothingToCollect'), tone: 'muted' },
    ];
    footer = [{ text: t('olympiad.tokensInfo') }, { text: t('olympiad.oneCharacter'), tone: 'muted' }];
    buttons = [
      { label: t('olympiad.calculatePoints'), onClick: () => Olympiad.claimTokens(), enabled: board.claimableTokens > 0 },
      { label: t('olympiad.equipmentRewards'), onClick: () => go('shop0') },
      { label: t('olympiad.miscRewards'), onClick: () => go('shop1') },
      back('main'),
    ];
  } else if (page === 'shop0' || page === 'shop1') {
    const category = page === 'shop0' ? 0 : 1;
    title = t(category === 0 ? 'olympiad.titleShopEquipment' : 'olympiad.titleShopMisc');
    rows = [{ label: t('olympiad.yourTokens'), value: String(board.tokens), tone: 'gold' }];
    const entries = board.shop.map((line, index) => ({ line, index })).filter(e => e.line.category === category);
    const perPage = entries.length > SHOP_ROWS.flat ? SHOP_ROWS.paged : SHOP_ROWS.flat;
    const pages = pageCount(entries.length, perPage);
    const p = Math.min(listPage, pages - 1);
    shop = entries.slice(p * perPage, (p + 1) * perPage).map(({ line, index }) => ({
      name: itemLevelName(line.group, line.number, line.level),
      price: line.price,
      index,
      affordable: board.tokens >= line.price,
      line,
    }));
    if (entries.length > 0) footer = [{ text: t('olympiad.clickToBuy'), tone: 'muted' }];
    buttons = [...pageButtons(p, pages, setListPage), back('tokens')];
  } else if (page === 'info') {
    title = t('olympiad.titleInfo');
    text = [{ text: t('olympiad.hearAbout') }];
    buttons = [
      ...INFO_TOPICS.map(([key], i) => ({
        label: t(key),
        onClick: () => {
          setTopic(i);
          setPage('infoText');
        },
        wide: true,
      })),
      back('main'),
    ];
  } else {
    title = t('olympiad.titleInfo');
    const [head, body] = INFO_TOPICS[topic] ?? INFO_TOPICS[0];
    text = [{ text: t(head), tone: 'gold' }, { text: t(body) }];
    buttons = [back('info')];
  }

  return (
    <ReforgeShell id={OLYMPIAD_WINDOW} title={title} width={250} height={420} closeButton={false} onClose={close} className="olympiad">
      {status.length > 0 && (
        <div className="ol-panel ol-status">
          <Lines lines={status} />
        </div>
      )}
      <Lines lines={text} />
      <Panel title={panelTitle} rows={rows} />
      {heroes.length > 0 && (
        <div className="ol-heroes">
          <div className="rf-table-head ol-hero-columns">
            <span>{t('olympiad.colName')}</span>
            <span>{t('olympiad.colClass')}</span>
            <span>{t('olympiad.colPoints')}</span>
            <span>{t('olympiad.colRate')}</span>
            <span>{t('olympiad.colTimes')}</span>
          </div>
          {heroes.map((h, i) => (
            <div key={i} className={`ol-hero-columns ol-hero${h.certified ? ' certified' : ''}`}>
              <span>{h.name}</span>
              <span>{classShort(h.classIndex)}</span>
              <span>{h.points}</span>
              <span>{winRatePercent(h.wins, h.matches)}%</span>
              <span>{h.timesHero}</span>
            </div>
          ))}
        </div>
      )}
      {shop && (
        <div className="ol-shop">
          <div className="rf-table-head ol-shop-columns">
            <span className="ol-shop-name">{t('olympiad.colItem')}</span>
            <span className="ol-shop-price">{t('olympiad.colTokens')}</span>
          </div>
          {shop.length === 0 && <div className="ol-shop-empty">{t('olympiad.nothingOnSale')}</div>}
          {shop.map(row => (
            <div
              key={row.index}
              className={`rf-row ol-shop-columns ol-shop-row${row.affordable ? '' : ' locked'}`}
              onClick={() => {
                if (!row.affordable) return;
                playUiSound('click');
                Olympiad.buy(row.index, row.line);
              }}
            >
              <span className="ol-shop-name">{row.name}</span>
              <span className="ol-shop-price">{row.price}</span>
            </div>
          ))}
        </div>
      )}
      <Lines lines={footer} />
      <Buttons buttons={buttons} />
    </ReforgeShell>
  );
});

/** `Ago`: now, minutes, hours, days, weeks, years. */
function ago(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return t('deathRecords.agoNow');
  if (m < 60) return t('deathRecords.agoMinutes', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('deathRecords.agoHours', { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t('deathRecords.agoDays', { n: d });
  if (d < 365) return t('deathRecords.agoWeeks', { n: Math.floor(d / 7) });
  return t('deathRecords.agoYears', { n: Math.floor(d / 365) });
}

/** The totals over the list: deaths, kills, K/D and the nemesis (the most deaths). */
function totals(records: DeathRecord[]): { deaths: number; kills: number; nemesis: DeathRecord | null } {
  let deaths = 0;
  let kills = 0;
  let nemesis: DeathRecord | null = null;
  for (const r of records) {
    deaths += r.deaths;
    kills += r.kills;
    if (!nemesis || r.deaths > nemesis.deaths) nemesis = r;
  }
  return { deaths, kills, nemesis };
}

/** reforge_death_records.rcss: Killer | Guild | Where (the rest) | D/K | When. */
const DR_COLUMNS = { killer: 64, guild: 64, dk: 36, when: 36 } as const;

/**
 * `CDeathRecordsWindow` (UI/DeathRecords/DeathRecordsWindow.cpp, reforge_death_records.rml), 316 x 392:
 * the summary (deaths, kills, K/D, nemesis), one row per opponent with the guild mark, two footer lines
 * (the hovered row's tally and time, or the opponent count), Refresh | Close.
 */
const DeathRecordsWindow = observer(() => {
  useTick(60000);
  const [hovered, setHovered] = useState(-1);
  const records = Olympiad.deathRecords;
  const close = () => MuWindows.setOpen(DEATH_RECORDS_WINDOW, false);
  const sum = totals(records);
  const pick = records[hovered];
  const kd = sum.deaths > 0 ? (sum.kills / sum.deaths).toFixed(2) : String(sum.kills);
  const empty = Olympiad.deathRecordsLoaded && records.length === 0;
  const nemesis = sum.nemesis && sum.nemesis.deaths > 0 ? sum.nemesis : null;

  return (
    <ReforgeShell id={DEATH_RECORDS_WINDOW} title={t('deathRecords.title')} width={316} height={392} closeButton={false} className="death-records">
      <div className="dr-summary">
        <div className="dr-stat dr-stat-deaths">
          <div className="dr-stat-label">{t('deathRecords.deaths')}</div>
          <div className="dr-stat-value">{sum.deaths}</div>
        </div>
        <div className="dr-stat dr-stat-kills">
          <div className="dr-stat-label">{t('deathRecords.kills')}</div>
          <div className="dr-stat-value">{sum.kills}</div>
        </div>
        <div className={`dr-stat dr-stat-kd${sum.kills >= sum.deaths ? ' ahead' : ''}`}>
          <div className="dr-stat-label">{t('deathRecords.kd')}</div>
          <div className="dr-stat-value">{kd}</div>
        </div>
        <div className={`dr-stat dr-stat-nemesis${nemesis ? ' has-nemesis' : ''}`}>
          <div className="dr-stat-label">{t('deathRecords.nemesis')}</div>
          <div className="dr-stat-value">{nemesis?.killer ?? '-'}</div>
        </div>
      </div>
      <RfTableHead
        className="dr-head"
        columns={[
          { label: t('deathRecords.killer'), width: DR_COLUMNS.killer, align: 'center' },
          { label: t('deathRecords.guild'), width: DR_COLUMNS.guild, align: 'center' },
          { label: t('deathRecords.where'), align: 'center' },
          { label: t('deathRecords.dk'), width: DR_COLUMNS.dk, align: 'center' },
          { label: t('deathRecords.when'), width: DR_COLUMNS.when, align: 'center' },
        ]}
      />
      <RfList height={206} className="dr-list">
        <div onPointerLeave={() => setHovered(-1)}>
          {records.map((r, i) => (
            <div key={i} className={`rf-row dr-row${r === nemesis ? ' nemesis' : ''}`} onPointerEnter={() => setHovered(i)}>
              <span className="dr-killer" style={columnStyle({ label: '', width: DR_COLUMNS.killer })}>
                {r.killer}
              </span>
              <span className={`dr-guild${r.guild ? '' : ' no-guild'}`} style={columnStyle({ label: '', width: DR_COLUMNS.guild })}>
                {r.guildMark && <img className="dr-mark" alt="" src={guildMarkDataUrl(packGuildMark(r.guildMark))} />}
                <span className="dr-guild-name">{r.guild || '-'}</span>
              </span>
              <span className="dr-where" style={columnStyle({ label: '' })}>
                {r.location}
              </span>
              <span className="dr-dk" style={columnStyle({ label: '', width: DR_COLUMNS.dk })}>
                <span className="dr-deaths">{r.deaths}</span>
                <span className="dr-sep">/</span>
                <span className="dr-kills">{r.kills}</span>
              </span>
              <span className="dr-when" style={columnStyle({ label: '', width: DR_COLUMNS.when })}>
                {ago(Date.now() - r.when)}
              </span>
            </div>
          ))}
          {empty && (
            <div className="dr-empty">
              <div className="dr-empty-title">{t('deathRecords.empty')}</div>
              <div className="dr-empty-hint">{t('deathRecords.emptyHint')}</div>
            </div>
          )}
        </div>
      </RfList>
      <RfFooter className="dr-footer">
        {pick ? t('deathRecords.footerTally', { deaths: pick.deaths, kills: pick.kills }) : t('deathRecords.opponents', { n: records.length })}
      </RfFooter>
      <RfFooter className="dr-footer-detail">
        {pick ? t('deathRecords.footerLastDeath', { where: pick.location, when: new Date(pick.when).toLocaleString() }) : ''}
      </RfFooter>
      <div className="dr-actions">
        <RfButton small label={t('deathRecords.refresh')} onClick={() => Olympiad.requestDeathRecords()} />
        <RfButton small label={t('olympiad.close')} onClick={close} />
      </div>
    </ReforgeShell>
  );
});

/** The Death Records' key in our client (`ReforgeMenuEntries.cpp`); a key bound to a built-in action stays the action's. */
const DEATH_RECORDS_KEY = 'KeyY';

export const OlympiadWindows = observer(() => {
  const deathOpen = MuWindows.isOpen(DEATH_RECORDS_WINDOW);
  useEventBus('keyPressed', key => {
    if (togglesWindow(DEATH_RECORDS_KEY, key)) MuWindows.setOpen(DEATH_RECORDS_WINDOW, !MuWindows.isOpen(DEATH_RECORDS_WINDOW));
  });
  // Opening asks for the list (`CDeathRecordsWindow::OpeningProcess`).
  useEffect(() => {
    if (deathOpen) Olympiad.requestDeathRecords();
  }, [deathOpen]);
  return (
    <>
      {MuWindows.isOpen(OLYMPIAD_WINDOW) && <OlympiadWindow />}
      {deathOpen && <DeathRecordsWindow />}
    </>
  );
});
