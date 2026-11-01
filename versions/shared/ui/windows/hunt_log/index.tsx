import './style.less';
import { useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { Ecs } from '@/ecs/current';
import { useUiStageScale, UI_STAGE_HEIGHT, UI_STAGE_WIDTH } from '@/controllers/interface/components/ui_stage';
import { playUiSound } from '@/controllers/sound/sfx';
import { MuWindows } from '@/controllers/interface/windowManager';
import { GameOptions } from '@/controllers/settings';
import { MuHelper } from '@/modules/mu_helper';
import { HuntLog, NOT_ESTIMABLE, closeHuntLog, helperStopped, huntLogShown, requestHuntLog } from '@/modules/hunt_log';

/**
 * The Hunting Log ("Instant Hunting Log", our client's UI/HuntLog/HuntLogHud.cpp, reforge_hunt_log.rml):
 * the current hunting session's figures from the server (C1 DA 01), asked for once a second while it
 * shows. It comes up by itself while the MU Helper runs, as the old client's did; its X closes it for
 * that run. A small translucent box on the stage's right edge (reforge_hunt_log.rcss); a click on the
 * title folds it, a drag moves it.
 */

/** The old client asked once a second while the panel showed; the server answers every request. */
const REQUEST_MS = 1000;
/**
 * Where a dragged log is kept (`MuWindows`' saved placements, our client's [Reforge] HuntLogX / HuntLogY):
 * not a stacked window, so Escape and the window order leave it alone. "Reset windows" puts it back.
 */
const PLACEMENT_ID = 'hunt_log_panel';

/** `Text::GroupedNumber`: 1,234,567. */
const grouped = (n: number) => Math.floor(n).toLocaleString('en-US');
const pad = (n: number) => String(n).padStart(2, '0');
/** `Text::Duration`: hh:mm:ss. */
const duration = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
/** `Text::TimeToLevel`: --:--:-- when unknown, dd:hh:mm:ss from a day on. */
const timeToLevel = (s: number) =>
  s === NOT_ESTIMABLE ? '--:--:--' : s < 86_400 ? duration(s) : `${pad(Math.floor(s / 86_400))}:${duration(s % 86_400)}`;

type Row = { label: string; value: string; gap?: boolean; vip?: boolean };

/** reforge_hunt_log.rcss `#panel`: 112 from the stage's top, 8 in from its right edge, 128 wide. */
const PANEL = { top: 112, right: 8, width: 128 } as const;
/** A press that moves less than this many screen pixels is a click: it folds the log (HuntLogPlacement.h). */
const CLICK_SLOP = 4;
/** Per sitting, as our client keeps it while the game runs. */
const folded = observable.box(false);

/**
 * HuntLogHud.cpp: the title is a drag handle and a fold switch. The panel's top left follows the
 * pointer, kept on screen by `MuWindows.moveTo`, and the place is saved; a press that barely moves folds.
 */
function pressTitle(event: ReactPointerEvent<HTMLDivElement>): void {
  if (event.button !== 0) return;
  if ((event.target as HTMLElement).closest('[data-no-drag]')) return;
  const head = event.currentTarget;
  const panel = head.parentElement;
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const offsetX = startX - rect.left;
  const offsetY = startY - rect.top;
  const pointerId = event.pointerId;
  let moved = false;
  head.setPointerCapture(pointerId);
  event.preventDefault();
  event.stopPropagation();

  const onMove = (move: PointerEvent) => {
    if (move.pointerId !== pointerId || GameOptions.lockWindows) return;
    if (!moved && Math.hypot(move.clientX - startX, move.clientY - startY) < CLICK_SLOP) return;
    moved = true;
    MuWindows.moveTo(PLACEMENT_ID, move.clientX - offsetX, move.clientY - offsetY);
  };
  const onUp = (up: PointerEvent) => {
    if (up.pointerId !== pointerId) return;
    if (head.hasPointerCapture(pointerId)) head.releasePointerCapture(pointerId);
    head.removeEventListener('pointermove', onMove);
    head.removeEventListener('pointerup', onUp);
    head.removeEventListener('pointercancel', onUp);
    if (!moved && up.type === 'pointerup') {
      playUiSound('click');
      runInAction(() => folded.set(!folded.get()));
    }
  };
  head.addEventListener('pointermove', onMove);
  head.addEventListener('pointerup', onUp);
  head.addEventListener('pointercancel', onUp);
}

const Panel = observer(() => {
  const scale = useUiStageScale();
  useEffect(() => {
    requestHuntLog();
    const id = setInterval(requestHuntLog, REQUEST_MS);
    return () => clearInterval(id);
  }, []);

  const s = HuntLog.statistics;
  const isFolded = folded.get();
  // The old client's three groups: time; damage and zen; levels and experience.
  const rows: Row[] = s
    ? [
        { label: t('huntLog.time'), value: duration(s.elapsedSeconds) },
        { label: t('huntLog.damagePerMinute'), value: grouped(s.damagePerMinute), gap: true },
        { label: t('huntLog.zenPerMinute'), value: grouped(s.zenPerMinute) },
        { label: t('huntLog.lastZen'), value: grouped(s.lastZen) },
        { label: t('huntLog.levelUps'), value: String(s.levelUps), gap: true },
        { label: t('huntLog.expPerMinute'), value: grouped(s.experiencePerMinuteNoVip) },
        { label: t('huntLog.expPerMinuteVip'), value: grouped(s.experiencePerMinuteWithVip), vip: true },
        { label: t('huntLog.avgExpPerMonster'), value: grouped(s.averageExperiencePerMonster) },
        { label: t('huntLog.lastExp'), value: grouped(s.lastExperience) },
        { label: t('huntLog.nextLevelIn', { n: s.nextLevel }), value: timeToLevel(s.secondsToNextLevel) },
        { label: t('huntLog.maxLevelIn'), value: timeToLevel(s.secondsToMaxLevel) },
      ]
    : [];
  const offsetX = (window.innerWidth - UI_STAGE_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - UI_STAGE_HEIGHT * scale) / 2;
  const placement = MuWindows.placement(PLACEMENT_ID);
  // A saved place stays on screen after the window shrinks (HuntLogPlacement.h), its title reachable.
  const left =
    placement.x === null
      ? offsetX + (UI_STAGE_WIDTH - PANEL.right - PANEL.width) * scale
      : Math.max(0, Math.min(placement.x, window.innerWidth - 40));
  const top = placement.y === null ? offsetY + PANEL.top * scale : Math.max(0, Math.min(placement.y, window.innerHeight - 20));

  return (
    <div className="hunt-log" style={{ left, top, width: PANEL.width, transform: `scale(${scale})` }}>
      <div className={`hunt-log-title${GameOptions.lockWindows ? '' : ' draggable'}`} title={t('huntLog.foldHint')} onPointerDown={pressTitle}>
        {t('huntLog.title')}
      </div>
      <span className={`hunt-log-fold${isFolded ? ' folded' : ''}`} data-no-drag="true" title={t('huntLog.foldHint')} onClick={() => runInAction(() => folded.set(!isFolded))}>
        {isFolded ? '+' : '-'}
      </span>
      <span
        className="hunt-log-close"
        data-no-drag="true"
        role="button"
        title={t('common.close')}
        onClick={() => {
          playUiSound('click');
          closeHuntLog(MuHelper.active);
        }}
      >
        x
      </span>
      {!isFolded &&
        rows.map(row => (
          <div key={row.label} className={`hunt-log-row${row.gap ? ' gap' : ''}${row.vip ? ' vip' : ''}`}>
            <span className="hunt-log-label">{row.label}</span>
            <span className="hunt-log-value">{row.value}</span>
          </div>
        ))}
      {s?.resetAvailable && <div className="hunt-log-reset">{t('huntLog.resetAvailable')}</div>}
    </div>
  );
});

/** Registered by `window.ts`. */
export const HuntLogHud = observer(() => {
  const helperActive = MuHelper.active;
  // Closing lasts for one helper run: the next start brings the log back.
  useEffect(() => {
    if (!helperActive) helperStopped();
  }, [helperActive]);
  if (!Ecs.world?.playerEntity || !huntLogShown(helperActive)) return null;
  return <Panel />;
});
