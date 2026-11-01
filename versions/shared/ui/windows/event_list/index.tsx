import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { serverNow } from '@/controllers/net/serverTime';
import {
  EventList,
  EventState,
  MiniGameType,
  countdownText,
  entriesLeft,
  isFull,
  isSpent,
  occupancy,
  requestEventList,
  secondsSinceReport,
  secondsUntilStart,
  type EventListEntry,
} from '@/modules/event_list';
import { ReforgeShell, RfFooter, RfList } from '../_shared/reforgeShell';

/**
 * The Event List (B): one card per mini-game event the server reports (C1 97): open, running or
 * waiting, the countdown to its next start, the players inside and the character's daily entries
 * left. Hovering a card names its entrance. Our C++ client's UI/EventList/EventListWindow.cpp
 * (reforge_event_list.rml), in the reforge shell. It asks again every five seconds while
 * open (C1 9F), as the old client did: a stale player count is the most misleading thing it can show.
 */

export const EVENT_LIST_WINDOW = 'event_list';
const WINDOW = EVENT_LIST_WINDOW;
/** Our client's key (B is upstream's Gens ranking; our server runs without Gens). */
const HOT_KEY = 'KeyB';
const REQUEST_MS = 5000;
const SOON_SECONDS = 5 * 60;
const IMMINENT_SECONDS = 60;

const NAME: Partial<Record<number, TextKey>> = {
  [MiniGameType.BloodCastle]: 'eventTimer.name.bloodCastle',
  [MiniGameType.DevilSquare]: 'eventTimer.name.devilSquare',
  [MiniGameType.ChaosCastle]: 'eventTimer.name.chaosCastle',
  [MiniGameType.CursedTemple]: 'eventTimer.name.illusionTemple',
  [MiniGameType.IllusionTemple]: 'eventTimer.name.illusionTemple',
  [MiniGameType.Doppelganger]: 'eventTimer.name.doppelganger',
};

/** `EntranceHint`, checked against the server's initialization data (docs/reforge/EVENT-LIST.md there). */
const ENTRANCE: Partial<Record<number, TextKey>> = {
  [MiniGameType.BloodCastle]: 'eventList.entry.bloodCastle',
  [MiniGameType.DevilSquare]: 'eventList.entry.devilSquare',
  [MiniGameType.ChaosCastle]: 'eventList.entry.chaosCastle',
  [MiniGameType.CursedTemple]: 'eventList.entry.illusionTemple',
  [MiniGameType.IllusionTemple]: 'eventList.entry.illusionTemple',
};

/** `StateText`. */
function stateText(entry: EventListEntry, seconds: number | null): string {
  if (entry.state === EventState.Open) return t('eventList.open');
  if (entry.state === EventState.Running) return t('eventList.running');
  if (entry.state === EventState.Ended) return t('eventList.ended');
  return seconds === null ? '--:--' : countdownText(seconds);
}

/** reforge_event_list.rcss's state classes: what colours the card. */
function stateClass(entry: EventListEntry, seconds: number | null): string {
  if (entry.state === EventState.Open) return 'open';
  if (entry.state === EventState.Running) return 'running';
  if (entry.state === EventState.Ended || seconds === null) return 'ended';
  if (seconds < IMMINENT_SECONDS) return 'imminent';
  return seconds < SOON_SECONDS ? 'soon' : '';
}

const Card = observer(({ entry, nowMs, onHover }: { entry: EventListEntry; nowMs: number; onHover: (hint: string) => void }) => {
  const seconds = secondsUntilStart(entry, secondsSinceReport(nowMs));
  const left = entriesLeft(entry);
  const name = NAME[entry.type];
  const hint = ENTRANCE[entry.type];
  const classes = ['rf-row', 'el-card', stateClass(entry, seconds), isSpent(entry) ? 'spent' : '', isFull(entry) ? 'full' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} onPointerEnter={() => onHover(hint ? t(hint) : '')}>
      <div className="el-line">
        <span className="el-name">{name ? t(name) : `#${entry.type}`}</span>
        <span className="el-state">{stateText(entry, seconds)}</span>
      </div>
      <div className="el-line">
        <span className="el-capacity">
          <span style={{ width: `${occupancy(entry) * 100}%` }} />
        </span>
        <span className="el-players">{`${entry.currentPlayers}/${entry.maxPlayers}`}</span>
        <span className={`el-entries${left === null ? ' unlimited' : ''}`}>
          {left === null ? t('eventList.noLimit') : t('eventList.left', { n: left })}
        </span>
      </div>
    </div>
  );
});

const Body = observer(() => {
  const [now, setNow] = useState(() => serverNow());
  const [hint, setHint] = useState('');
  useEffect(() => {
    requestEventList();
    const tick = setInterval(() => setNow(serverNow()), 1000);
    const poll = setInterval(requestEventList, REQUEST_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, []);

  const entries = EventList.entries;
  const placeholder = EventList.receivedAtMs === null ? t('eventList.loading') : entries.length ? '' : t('eventList.empty');

  return (
    <>
      <RfList height={152} className="el-list">
        <div onPointerLeave={() => setHint('')}>
          {placeholder && <div className="el-placeholder">{placeholder}</div>}
          {entries.map(entry => (
            <Card key={entry.type} entry={entry} nowMs={now} onHover={setHint} />
          ))}
        </div>
      </RfList>
      <RfFooter className="el-footer">{hint || t('eventList.resetHint')}</RfFooter>
    </>
  );
});

/** `CEventListWindow`: 230 x 264, the card list (152 high), the footer, Close. */
export const EventListWindow = observer(() => (
  <ReforgeShell id={WINDOW} title={t('eventList.title')} hotKey={HOT_KEY} height={264} className="event-list">
    <Body />
  </ReforgeShell>
));
