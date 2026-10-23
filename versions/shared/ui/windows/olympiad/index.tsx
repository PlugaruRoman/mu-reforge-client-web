import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { togglesWindow } from '@/controllers/interface/components/module_window';
import { useEventBus } from '@/controllers/interface/hooks';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
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

/**
 * The Battle Statue window (our client's UI/Olympiad/OlympiadWindow.cpp, reforge_olympiad.rml) and
 * the Death Records (UI/DeathRecords/DeathRecordsWindow.cpp). The statue opens it on a click
 * (NPC 650); everything shows the server's board (C2 EE 01), asked for on opening and after every
 * action. The Death Records open with their key (Y in our client).
 */

const TONE = {
  normal: TEXT_COLOR.brightGray,
  good: 'rgb(120, 230, 120)',
  gold: TEXT_COLOR.brightOrange,
  warn: TEXT_COLOR.orange,
  bad: 'rgb(255, 90, 70)',
  muted: 'rgb(150, 150, 150)',
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
      <MuText key={i} className="ol-line" text={l.text} color={TONE[l.tone ?? 'normal']} />
    ))}
  </>
));

const Panel = observer(({ title, rows }: { title?: string; rows: Row[] }) =>
  rows.length === 0 ? null : (
    <div className="ol-panel">
      {title && <MuText face="bold" className="ol-panel-title" text={title} color={TEXT_COLOR.brightYellow} />}
      {rows.map((r, i) => (
        <div key={i} className="ol-row">
          <MuText text={r.label} color={TEXT_COLOR.orange} />
          <MuText text={r.value} color={TONE[r.tone ?? 'normal']} />
        </div>
      ))}
    </div>
  ));

const Buttons = observer(({ buttons }: { buttons: Button[] }) => (
  <div className="ol-buttons" data-no-drag="true">
    {buttons.map((b, i) => (
      <div
        key={i}
        className={`ol-button${b.wide ? ' wide' : ''}${b.enabled === false ? ' disabled' : ''}`}
        onClick={() => {
          if (b.enabled === false) return;
          playUiSound('click');
          b.onClick();
        }}
      >
        {b.label}
      </div>
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
    <MuItemWindow id="olympiad-window" label={title} onClose={close}>
      <MuText face="bold" align="center" className="ol-title" text={title} />
      <div className="ol-body">
        <Lines lines={status} />
        <Panel title={panelTitle} rows={rows} />
        <Lines lines={text} />
        {heroes.length > 0 && (
          <div className="ol-table">
            <div className="ol-table-row head">
              <span>{t('olympiad.colName')}</span>
              <span>{t('olympiad.colClass')}</span>
              <span>{t('olympiad.colPoints')}</span>
              <span>{t('olympiad.colRate')}</span>
              <span>{t('olympiad.colTimes')}</span>
            </div>
            {heroes.map((h, i) => (
              <div key={i} className={`ol-table-row${h.certified ? ' certified' : ''}`}>
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
          <div className="ol-table" data-no-drag="true">
            <div className="ol-table-row head shop">
              <span>{t('olympiad.colItem')}</span>
              <span>{t('olympiad.colTokens')}</span>
            </div>
            {shop.length === 0 && <MuText className="ol-line" text={t('olympiad.nothingOnSale')} color={TONE.muted} />}
            {shop.map(row => (
              <div
                key={row.index}
                className={`ol-table-row shop buy${row.affordable ? '' : ' disabled'}`}
                onClick={() => {
                  if (!row.affordable) return;
                  playUiSound('click');
                  Olympiad.buy(row.index, row.line);
                }}
              >
                <span>{row.name}</span>
                <span>{row.price}</span>
              </div>
            ))}
          </div>
        )}
        <Lines lines={footer} />
      </div>
      <Buttons buttons={buttons} />
    </MuItemWindow>
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
function totals(records: DeathRecord[]): { deaths: number; kills: number; nemesis: string } {
  let deaths = 0;
  let kills = 0;
  let nemesis: DeathRecord | null = null;
  for (const r of records) {
    deaths += r.deaths;
    kills += r.kills;
    if (!nemesis || r.deaths > nemesis.deaths) nemesis = r;
  }
  return { deaths, kills, nemesis: nemesis?.killer ?? '-' };
}

const DeathRecordsWindow = observer(() => {
  useTick(60000);
  const [selected, setSelected] = useState(-1);
  const records = Olympiad.deathRecords;
  const close = () => MuWindows.setOpen(DEATH_RECORDS_WINDOW, false);
  const sum = totals(records);
  const pick = records[selected];
  const kd = sum.deaths > 0 ? (sum.kills / sum.deaths).toFixed(2) : String(sum.kills);

  return (
    <MuItemWindow id="death-records-window" column={1} label={t('deathRecords.title')} onClose={close}>
      <MuText face="bold" align="center" className="ol-title" text={t('deathRecords.title')} />
      <div className="ol-body">
        <div className="ol-panel">
          <div className="ol-row">
            <MuText text={t('deathRecords.deaths')} color={TEXT_COLOR.orange} />
            <MuText text={String(sum.deaths)} color={TONE.bad} />
          </div>
          <div className="ol-row">
            <MuText text={t('deathRecords.kills')} color={TEXT_COLOR.orange} />
            <MuText text={String(sum.kills)} color={TONE.good} />
          </div>
          <div className="ol-row">
            <MuText text={t('deathRecords.kd')} color={TEXT_COLOR.orange} />
            <MuText text={kd} />
          </div>
          <div className="ol-row">
            <MuText text={t('deathRecords.nemesis')} color={TEXT_COLOR.orange} />
            <MuText text={sum.nemesis} color={TONE.gold} />
          </div>
        </div>
        {Olympiad.deathRecordsLoaded && records.length === 0 ? (
          <Lines lines={[{ text: t('deathRecords.empty') }, { text: t('deathRecords.emptyHint'), tone: 'muted' }]} />
        ) : (
          <div className="ol-table dr-table" data-no-drag="true">
            <div className="ol-table-row head dr">
              <span>{t('deathRecords.killer')}</span>
              <span>{t('deathRecords.dk')}</span>
              <span>{t('deathRecords.when')}</span>
            </div>
            {records.map((r, i) => (
              <div
                key={i}
                className={`ol-table-row dr buy${i === selected ? ' selected' : ''}`}
                title={`${r.guild ? `${r.guild} - ` : ''}${r.location}`}
                onClick={() => setSelected(i)}
              >
                <span>{r.killer}</span>
                <span>
                  {r.deaths}/{r.kills}
                </span>
                <span>{ago(Date.now() - r.when)}</span>
              </div>
            ))}
          </div>
        )}
        {pick && (
          <Lines
            lines={[
              { text: t('deathRecords.footerTally', { deaths: pick.deaths, kills: pick.kills }) },
              { text: t('deathRecords.footerLastDeath', { where: pick.location, when: new Date(pick.when).toLocaleString() }), tone: 'muted' },
            ]}
          />
        )}
      </div>
      <Buttons
        buttons={[
          { label: t('deathRecords.refresh'), onClick: () => Olympiad.requestDeathRecords() },
          { label: t('olympiad.close'), onClick: close },
        ]}
      />
    </MuItemWindow>
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
