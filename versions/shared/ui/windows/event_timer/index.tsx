import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { serverNow } from '@/controllers/net/serverTime';
import {
  countdownText,
  timerRows,
  type TimerEntry,
  type TimerRow,
  type TimerTab,
} from '@/modules/event_list';
import { ReforgeShell, RfFooter, RfList, RfTableHead, RfTabs } from '../_shared/reforgeShell';
import { Invasions, findRunning, isTownInvasion, requestInvasionStatus, secondsSinceDefeat } from '@/modules/invasions';

/**
 * The Event Timer (H): the server's scheduled events and invasions with live countdowns, in two tabs.
 * Running events come first and count down to their end; a beaten invasion shows who slew it. Our
 * C++ client's UI/EventTimer/EventTimerWindow.cpp (reforge_event_timer.rml), in the reforge shell. The
 * rows are `modules/event_list/timetable.ts`; the boss status `modules/invasions`, asked every five
 * seconds while the window is open.
 */

export const EVENT_TIMER_WINDOW = 'event_timer';
/** Our client's key; a key a built-in action has (H hides the interface) stays the action's. */
const HOT_KEY = 'KeyH';
const STATUS_POLL_MS = 5000;
/** A start inside this many seconds is shown in red. */
const SOON_SECONDS = 5 * 60;

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (secondOfDay: number) => `${pad(Math.floor(secondOfDay / 3600) % 24)}:${pad(Math.floor((secondOfDay % 3600) / 60))}`;
const dayName = (day: number) => t(`eventTimer.day.${((day % 7) + 7) % 7}` as TextKey);
const nameOf = (entry: TimerEntry) => t(`eventTimer.name.${entry.id}` as TextKey);
const whereOf = (entry: TimerEntry) => t(`eventTimer.where.${entry.where}` as TextKey);

/** `Text::Span`: whole hours and minutes. */
function span(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return t('eventTimer.span.hoursMinutes', { h, m });
  return h > 0 ? t('eventTimer.span.hours', { h }) : t('eventTimer.span.minutes', { m });
}

/** `Text::Cadence`: how often the row comes around. */
function cadence(entry: TimerEntry): string {
  const tt = entry.timetable;
  if (tt.dayOfWeek >= 0 && tt.alsoDays) {
    return [0, 1, 2, 3, 4, 5, 6].filter(d => ((1 << tt.dayOfWeek) | tt.alsoDays) & (1 << d)).map(dayName).join('/');
  }
  if (tt.dayOfWeek >= 0) return t('eventTimer.cadence.weekly', { day: dayName(tt.dayOfWeek) });
  if (tt.intervalMinutes > 0) return t('eventTimer.cadence.every', { span: span(tt.intervalMinutes) });
  return tt.times.length <= 1 ? t('eventTimer.cadence.onceADay') : t('eventTimer.cadence.timesADay', { n: tt.times.length });
}

/** The local clock: the page's own time zone. */
function localClock(nowMs: number): { secondOfDay: number; day: number } {
  const d = new Date(nowMs);
  return { secondOfDay: d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(), day: d.getDay() };
}

/** `Text::LocalStart`: the start on the local clock, with its weekday when not today. */
function localStart(secondsToStart: number, nowMs: number): string {
  const local = localClock(nowMs);
  const start = local.secondOfDay + secondsToStart;
  const shift = Math.floor(start / 86_400);
  const time = hhmm(start % 86_400);
  return shift === 0 ? time : t('eventTimer.startsOnDay', { day: dayName(local.day + shift), time });
}

type Shown = { name: string; when: string; time: string; tone: 'live' | 'beaten' | 'elsewhere' | 'soon' | 'next' | 'wait' };

/** `MakeRow`. */
function shownRow({ entry, state }: TimerRow, nowMs: number): Shown {
  const name = nameOf(entry);
  if (state.defeated) {
    return { name, when: t(isTownInvasion(entry.statusId) ? 'eventTimer.cleared' : 'eventTimer.slain'), time: countdownText(state.run.secondsToStart), tone: 'beaten' };
  }
  if (state.otherServer) {
    return {
      name,
      when: t('eventTimer.onServer', { n: state.otherServer }),
      time: countdownText(state.run.running ? state.run.secondsToEnd : state.run.secondsToStart),
      tone: 'elsewhere',
    };
  }
  if (state.run.running) {
    return { name, when: t('eventTimer.live'), time: state.run.secondsToEnd > 0 ? countdownText(state.run.secondsToEnd) : '', tone: 'live' };
  }
  return {
    name,
    when: localStart(state.run.secondsToStart, nowMs),
    time: countdownText(state.run.secondsToStart),
    tone: state.run.secondsToStart < SOON_SECONDS ? 'soon' : 'wait',
  };
}

/** `HoverDetail`: the hovered row's where / how often / how long, or its server status. */
function hoverDetail({ entry, state }: TimerRow, nowMs: number): string {
  const where = whereOf(entry);
  const status = findRunning(entry.statusId, nowMs);
  if (state.defeated && status) {
    const ago = span(Math.max(1, Math.floor(secondsSinceDefeat(status, nowMs) / 60)));
    const killer = status.killer || '?';
    return t(isTownInvasion(entry.statusId) ? 'eventTimer.footer.cleared' : 'eventTimer.footer.slain', { where, killer, ago });
  }
  if (state.otherServer) return t('eventTimer.footer.otherServer', { where, n: state.otherServer });
  if (state.run.running && status) return t('eventTimer.footer.alive', { where, alive: status.alive, total: status.total });
  return t('eventTimer.footer.detail', { where, cadence: cadence(entry), span: span(entry.timetable.durationMinutes) });
}

/** reforge_event_timer.rcss: the Starts and Time columns. */
const WHEN_WIDTH = 58;
const TIME_WIDTH = 54;

const TABS: readonly TimerTab[] = ['events', 'invasions'];

/** The whole second on the shared clock, re-read once a second while mounted. */
function useNow(): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
const Body = observer(() => {
  const now = useNow();
  const [tab, setTab] = useState<TimerTab>('events');
  const [hovered, setHovered] = useState(-1);
  // Read so a new report redraws at once (the push at a killing blow).
  void Invasions.version;

  // Ask on opening, then every five seconds (the server answers one a second).
  useEffect(() => {
    requestInvasionStatus();
    const id = setInterval(requestInvasionStatus, STATUS_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const { rows, live } = timerRows(tab, now);
  let nextMarked = false;
  const shown = rows.map(row => {
    const s = shownRow(row, now);
    if (s.tone === 'wait' || s.tone === 'soon') {
      if (!nextMarked && s.tone === 'wait') s.tone = 'next';
      nextMarked = true;
    }
    return s;
  });
  const local = localClock(now);
  const footer = hovered >= 0 && hovered < rows.length
    ? hoverDetail(rows[hovered], now)
    : t('eventTimer.clocks', { local: hhmm(local.secondOfDay), utc: hhmm(Math.floor(now / 1000) % 86_400) });

  return (
    <>
      <RfTabs
        tabs={TABS.map(id => ({ id, label: t(id === 'events' ? 'eventTimer.tab.events' : 'eventTimer.tab.invasions'), live: live[id] }))}
        active={tab}
        onSelect={id => {
          setTab(id);
          setHovered(-1);
        }}
      />
      <RfTableHead
        className="et-head"
        columns={[
          { label: t('eventTimer.column.event') },
          { label: t('eventTimer.column.starts'), width: WHEN_WIDTH },
          { label: t('eventTimer.column.time'), width: TIME_WIDTH, align: 'right' },
        ]}
      />
      <RfList height={206} className="et-list">
        <div onPointerLeave={() => setHovered(-1)}>
          {shown.map((row, i) => {
            const { entry, state } = rows[i];
            const duration = entry.timetable.durationMinutes * 60;
            return (
              <div key={entry.id} className={`rf-row et-row ${row.tone}${hovered === i ? ' hovered' : ''}`} onPointerEnter={() => setHovered(i)}>
                <span className="et-gem" />
                <span className="et-name">{row.name}</span>
                <span className="et-when" style={{ flex: `0 0 ${WHEN_WIDTH}px` }}>{row.when}</span>
                <span className="et-time" style={{ flex: `0 0 ${TIME_WIDTH}px` }}>{row.time}</span>
                {row.tone === 'live' && duration > 0 && (
                  <span className="et-drain" style={{ width: `${Math.min(100, (state.run.secondsToEnd / duration) * 100)}%` }} />
                )}
              </div>
            );
          })}
        </div>
      </RfList>
      <RfFooter className="et-footer" title={footer}>{footer}</RfFooter>
    </>
  );
});

/** `CEventTimerWindow`: 260 x 362, tabs, the Event | Starts | Time list (206 high), the footer, Close. */
export const EventTimerWindow = observer(() => (
  <ReforgeShell id={EVENT_TIMER_WINDOW} title={t('eventTimer.title')} hotKey={HOT_KEY} width={260} height={362} className="reforge-event-timer">
    <Body />
  </ReforgeShell>
));
