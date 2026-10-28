import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import { serverNow } from '@/controllers/net/serverTime';
import { ModuleWindowFrame } from '@/controllers/interface/components/module_window';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { playUiSound } from '@/controllers/sound/sfx';
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

/**
 * The Event List (B): one card per mini-game event the server reports (C1 97): open, running or
 * waiting, the countdown to its next start, the players inside and the character's daily entries
 * left. Hovering a card names its entrance. Our C++ client's UI/EventList/EventListWindow.cpp
 * (reforge_event_list.rml), drawn in the item window frame. It asks again every five seconds while
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

function stateColor(entry: EventListEntry, seconds: number | null): string {
  if (entry.state === EventState.Open) return 'rgb(120, 230, 120)';
  if (entry.state === EventState.Running) return TEXT_COLOR.brightOrange;
  if (entry.state === EventState.Ended || seconds === null) return 'rgb(150, 150, 150)';
  if (seconds < IMMINENT_SECONDS) return 'rgb(255, 90, 70)';
  return seconds < SOON_SECONDS ? TEXT_COLOR.orange : TEXT_COLOR.brightGray;
}

const Card = observer(({ entry, nowMs, onHover }: { entry: EventListEntry; nowMs: number; onHover: (hint: string) => void }) => {
  const seconds = secondsUntilStart(entry, secondsSinceReport(nowMs));
  const left = entriesLeft(entry);
  const name = NAME[entry.type];
  const hint = ENTRANCE[entry.type];
  return (
    <div
      className={`event-list-card${isSpent(entry) ? ' spent' : ''}`}
      onPointerEnter={() => onHover(hint ? t(hint) : '')}
    >
      <div className="event-list-line">
        <MuText face="bold" text={name ? t(name) : `#${entry.type}`} color={TEXT_COLOR.brightYellow} />
        <MuText face="bold" text={stateText(entry, seconds)} color={stateColor(entry, seconds)} />
      </div>
      <div className="event-list-bar">
        <div className={`event-list-fill${isFull(entry) ? ' full' : ''}`} style={{ width: `${occupancy(entry) * 100}%` }} />
      </div>
      <div className="event-list-line">
        <MuText text={`${entry.currentPlayers}/${entry.maxPlayers}`} color={TEXT_COLOR.brightGray} />
        <MuText
          text={left === null ? t('eventList.noLimit') : t('eventList.left', { n: left })}
          color={left === 0 ? 'rgb(255, 90, 70)' : TEXT_COLOR.brightGray}
        />
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
    <div className="event-list">
      <div className="event-list-cards" data-no-drag="true" onPointerLeave={() => setHint('')}>
        {placeholder && <MuText className="event-list-placeholder" text={placeholder} color={TEXT_COLOR.brightGray} />}
        {entries.map(entry => (
          <Card key={entry.type} entry={entry} nowMs={now} onHover={setHint} />
        ))}
      </div>
      <MuText className="event-list-footer" text={hint || t('eventList.resetHint')} color={TEXT_COLOR.brightYellow} />
      <div className="event-list-timer" data-no-drag="true">
        <MuButton
          file="newui_btn_empty.OZT"
          width={108}
          height={29}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label={t('eventList.timer')}
          labelStyle={{ fontSize: 11 }}
          onClick={() => {
            playUiSound('click');
            runInAction(() => MuWindows.setOpen('event_timer', true));
          }}
        />
      </div>
    </div>
  );
});

/** Registered by `window.ts`. */
export const EventListWindow = observer(() => (
  <ModuleWindowFrame id={WINDOW} title={t('eventList.title')} hotKey={HOT_KEY}>
    {MuWindows.isOpen(WINDOW) && <Body />}
  </ModuleWindowFrame>
));
