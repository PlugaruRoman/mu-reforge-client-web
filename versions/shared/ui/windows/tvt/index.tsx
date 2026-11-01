import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { Ecs } from '@/ecs/current';
import { ENUM_WORLD } from '@/core/types';
import { MuWindows } from '@/controllers/interface';
import { serverNow } from '@/controllers/net/serverTime';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { useUiStageScale, UI_STAGE_WIDTH } from '@/controllers/interface/components/ui_stage';
import { TVT_TIMETABLE, stateAt, utcMomentOf } from '@/modules/event_list';
import { BLUE_TEAM, RED_TEAM, TVT_WINDOW, Tvt, closeTvtWindow, joinTvt, tvtSecondsLeft } from '@/modules/tvt';
import { ReforgeShell, RfButton, RfList, RfTableHead } from '../_shared/reforgeShell';

/**
 * Team vs Team: the Battle Master's window (our client's UI/Tvt/TvtWindow.cpp, reforge_tvt.rml) and
 * the score board on the arena (UI/Tvt/TvtScoreHud.cpp). The window shows the live status, the daily
 * timetable (UTC, the next battle picked out), what the arena is, and Join / Close. Whether the
 * registration is open is the server's word (C1 E2 02), never the timetable's.
 */

const BLUE = 'rgb(80, 160, 255)';
const RED = 'rgb(255, 80, 70)';

const pad = (n: number) => String(n).padStart(2, '0');

function useNow(): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * `CTvtWindow` (reforge_tvt.rml), 230 x 330: the status box, the "Schedule" grid (two slots a row), the
 * "Arena" box (three lines), Join | Close.
 */
const Window = observer(() => {
  const now = useNow();
  const open = Tvt.registrationOpen;
  const utc = utcMomentOf(now);
  const toStart = stateAt(TVT_TIMETABLE, utc).secondsToStart;
  const countdown = `${pad(Math.floor(toStart / 3600))}:${pad(Math.floor((toStart % 3600) / 60))}:${pad(toStart % 60)}`;
  // The next battle is picked out only while it is still to come, not while its registration runs.
  const nextMinute = open ? -1 : Math.floor((utc.secondOfDay + toStart) / 60) % 1440;

  return (
    <ReforgeShell id={TVT_WINDOW} title={t('tvt.title')} height={330} closeButton={false} className="tvt-window" onClose={closeTvtWindow}>
      <div className={`tvt-status${open ? ' open' : ''}`}>
        <div className="tvt-status-caption">{t(open ? 'tvt.registrationOpen' : 'tvt.nextBattle')}</div>
        <div className="tvt-status-value">{open ? t('tvt.joinHint') : countdown}</div>
      </div>
      <RfTableHead columns={[{ label: t('tvt.scheduleTitle'), align: 'center' }]} />
      <RfList height={40} className="tvt-schedule">
        {TVT_TIMETABLE.times.map(minute => (
          <div key={minute} className={`tvt-slot${minute === nextMinute ? ' next' : ''}`}>
            {`${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`}
          </div>
        ))}
      </RfList>
      <RfTableHead columns={[{ label: t('tvt.arenaTitle'), align: 'center' }]} />
      <div className="tvt-arena">
        <div className="tvt-arena-line">{t('tvt.arenaDescription')}</div>
        <div className="tvt-arena-line">{t('tvt.winnersEarnZen')}</div>
        <div className="tvt-arena-line tvt-requirement">{t('tvt.requiresLevel')}</div>
      </div>
      <div className="tvt-actions">
        <RfButton className="tvt-join" label={t('tvt.join')} disabled={!open} onClick={joinTvt} />
        <RfButton small label={t('common.close')} onClick={closeTvtWindow} />
      </div>
    </ReforgeShell>
  );
});

/** The score board, top right, on the arena while a match runs (`TvtScoreHud`). */
const ScoreHud = observer(() => {
  const now = useNow();
  const scale = useUiStageScale();
  const match = Tvt.match;
  if (!match.active || Ecs.world?.mapIndex !== ENUM_WORLD.WD_87TEAM_VS_TEAM) return null;
  const left = tvtSecondsLeft(now);
  const own = match.ownTeam === BLUE_TEAM || match.ownTeam === RED_TEAM ? match.ownTeam : -1;
  const offsetX = (window.innerWidth - UI_STAGE_WIDTH * scale) / 2;
  return (
    <div className="tvt-score" style={{ right: offsetX + 8 * scale, top: 120 * scale, transform: `scale(${scale})` }}>
      <MuText face="bold" className="tvt-score-title" text={t('tvt.hud')} color={TEXT_COLOR.brightYellow} />
      <MuText face="bold" className={`tvt-score-team${own === BLUE_TEAM ? ' own' : ''}`} text={t('tvt.scoreBlue', { n: match.blueScore })} color={BLUE} />
      <MuText face="bold" className={`tvt-score-team${own === RED_TEAM ? ' own' : ''}`} text={t('tvt.scoreRed', { n: match.redScore })} color={RED} />
      <MuText face="bold" className="tvt-score-time" text={`${pad(Math.floor(left / 60))}:${pad(left % 60)}`} color={left < 60 ? RED : TEXT_COLOR.white} />
    </div>
  );
});

/** Registered by `window.ts`. */
export const TvtWindows = observer(() => (
  <>
    <ScoreHud />
    {MuWindows.isOpen(TVT_WINDOW) && Tvt.battleMaster && <Window />}
  </>
));
