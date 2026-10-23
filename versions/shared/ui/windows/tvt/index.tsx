import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { Ecs } from '@/ecs/current';
import { ENUM_WORLD } from '@/core/types';
import { MuWindows } from '@/controllers/interface';
import { serverNow } from '@/controllers/net/serverTime';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { useUiStageScale, UI_STAGE_WIDTH } from '@/controllers/interface/components/ui_stage';
import { playUiSound } from '@/controllers/sound/sfx';
import { TVT_TIMETABLE, stateAt, utcMomentOf } from '@/modules/event_list';
import { BLUE_TEAM, RED_TEAM, TVT_WINDOW, Tvt, closeTvtWindow, joinTvt, tvtSecondsLeft } from '@/modules/tvt';

/**
 * Team vs Team: the Battle Master's window (our client's UI/Tvt/TvtWindow.cpp, reforge_tvt.rml) and
 * the score board on the arena (UI/Tvt/TvtScoreHud.cpp). The window shows the live status, the daily
 * timetable (UTC, the next battle picked out), what the arena is, and Join / Close. Whether the
 * registration is open is the server's word (C1 E2 02), never the timetable's.
 */

const BLUE = 'rgb(80, 160, 255)';
const RED = 'rgb(255, 80, 70)';
const OPEN_GREEN = 'rgb(120, 230, 120)';

const pad = (n: number) => String(n).padStart(2, '0');

function useNow(): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const Window = observer(() => {
  const now = useNow();
  const open = Tvt.registrationOpen;
  const utc = utcMomentOf(now);
  const toStart = stateAt(TVT_TIMETABLE, utc).secondsToStart;
  const countdown = `${pad(Math.floor(toStart / 3600))}:${pad(Math.floor((toStart % 3600) / 60))}:${pad(toStart % 60)}`;
  // The next battle is picked out only while it is still to come, not while its registration runs.
  const nextMinute = open ? -1 : Math.floor((utc.secondOfDay + toStart) / 60) % 1440;

  return (
    <MuItemWindow id="tvt-window" label={t('tvt.title')} onClose={closeTvtWindow}>
      <MuText face="bold" align="center" className="tvt-title" text={t('tvt.title')} />
      <div className="tvt-body">
        <MuText className="tvt-caption" text={t(open ? 'tvt.registrationOpen' : 'tvt.nextBattle')} color={open ? OPEN_GREEN : TEXT_COLOR.brightGray} />
        <MuText face="bold" className="tvt-status" text={open ? t('tvt.joinHint') : countdown} color={open ? OPEN_GREEN : TEXT_COLOR.brightOrange} />
        <MuText className="tvt-section" text={t('tvt.scheduleTitle')} color={TEXT_COLOR.orange} />
        <div className="tvt-slots">
          {TVT_TIMETABLE.times.map(minute => (
            <MuText
              key={minute}
              className={`tvt-slot${minute === nextMinute ? ' next' : ''}`}
              text={`${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`}
              color={minute === nextMinute ? TEXT_COLOR.brightOrange : TEXT_COLOR.brightGray}
            />
          ))}
        </div>
        <MuText className="tvt-section" text={t('tvt.arenaTitle')} color={TEXT_COLOR.orange} />
        <MuText className="tvt-line" text={t('tvt.arenaDescription')} color={TEXT_COLOR.brightGray} />
        <MuText className="tvt-line" text={t('tvt.winnersEarnZen')} color={TEXT_COLOR.brightGray} />
        <MuText className="tvt-line" text={t('tvt.requiresLevel')} color={TEXT_COLOR.brightGray} />
      </div>
      <div className="tvt-join" data-no-drag="true">
        <MuButton
          file="newui_btn_empty.OZT"
          width={108}
          height={29}
          frames={{ up: 0, active: 1, down: 2 }}
          disabled={!open}
          color={open ? TEXT_COLOR.brightGray : 'rgb(120, 120, 120)'}
          activeColor={TEXT_COLOR.white}
          label={t('tvt.join')}
          labelStyle={{ fontSize: 11 }}
          onClick={() => {
            playUiSound('click');
            joinTvt();
          }}
          style={open ? undefined : { filter: 'brightness(0.6)' }}
        />
      </div>
    </MuItemWindow>
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
