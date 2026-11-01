import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { Ecs } from '@/ecs/current';
import { MuWindows } from '@/controllers/interface';
import { serverNow } from '@/controllers/net/serverTime';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { useUiStageScale, UI_STAGE_WIDTH } from '@/controllers/interface/components/ui_stage';
import { playUiSound } from '@/controllers/sound/sfx';
import { addNotification } from '@/modules/chat';
import { Hero } from '@/modules/hero';
import { Resets } from '@/modules/resets';
import {
  DEEP_DUNGEON_WINDOW,
  DeepDungeon,
  FIRST_FLOOR_MAP,
  FLOORS,
  closeDeepDungeon,
  enterDeepDungeon,
  hudUrgency,
  secondsLeft,
  suggestedFloor,
  windowUrgency,
  type Urgency,
} from '@/modules/deep_dungeon';
import { ReforgeShell, RfButton, RfList } from '../_shared/reforgeShell';

/**
 * The Deep Dungeon: the floor selection the server opens at the Dungeon Guide (C1 E3 01, our client's
 * UI/DeepDungeon/DeepDungeonWindow.cpp, reforge_deep_dungeon.rml) and the countdown HUD inside
 * (E3 03, DeepDungeonHud.cpp). Entering is two steps, so a stray click never teleports: a click on a
 * floor selects it and fills the details below; the Enter button (or a double click) sends E3 02.
 */

const URGENCY_COLOR: Record<Urgency, string> = { calm: TEXT_COLOR.brightGray, soon: TEXT_COLOR.orange, last: 'rgb(255, 90, 70)' };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function useNow(): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const DIFFICULTY_TIER: Record<string, number> = { easy: 0, normal: 1, hard: 2, veryHard: 3, extreme: 4 };
const URGENCY_CLASS: Record<Urgency, string> = { calm: '', soon: ' soon', last: ' last' };

/**
 * `CDeepDungeonWindow` (reforge_deep_dungeon.rml), 230 x 346: the status box (time left, the level asked
 * for), the floors (104 high, rows of 20, a notch on the one that fits the character's resets), the
 * details of the hovered or selected floor (92 high), Enter | Close.
 */
const Window = observer(() => {
  const now = useNow();
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(-1);
  // Mounted only while there is a selection; read after the hooks so their order never changes.
  const selection = DeepDungeon.selection;
  if (!selection) return null;
  const left = secondsLeft(selection.remainingSeconds, now - DeepDungeon.selectionAtMs);
  const level = Hero.level;
  const levelOk = level >= selection.minimumLevel;
  const canEnter = levelOk && left > 0;
  const shown = hovered >= 0 && hovered < selection.floorCount ? hovered : selected;
  const info = FLOORS[shown];
  const last = shown === selection.floorCount - 1;
  // The notch: only once the server told the character's resets (the Reset window's answer).
  const resets = Resets.reset?.currentResets;
  const suggested = resets === undefined ? -1 : suggestedFloor(resets, selection.floorCount);
  const fit = suggested < 0 || shown === suggested ? '' : shown > suggested ? ' harder' : ' easier';

  const tryEnter = () => {
    if (!levelOk) {
      // The level line is red already; the click still answers why nothing happens.
      addNotification(t('deepDungeon.levelRequired', { level: selection.minimumLevel }), 'error');
      return;
    }
    if (left > 0) enterDeepDungeon(selected + 1);
  };

  return (
    <ReforgeShell
      id={DEEP_DUNGEON_WINDOW}
      title={t('deepDungeon.title')}
      height={346}
      closeButton={false}
      className="deep-dungeon"
      onClose={closeDeepDungeon}
    >
      <div className="dd-status">
        <div className={`dd-timer${left > 0 ? URGENCY_CLASS[windowUrgency(left)] : ' closed'}`}>
          {left > 0 ? t('deepDungeon.closesIn', { time: mmss(left) }) : t('deepDungeon.closedNow')}
        </div>
        <div className={`dd-level${levelOk ? '' : ' blocked'}`}>
          {levelOk
            ? t('deepDungeon.requiresLevel', { level: selection.minimumLevel })
            : t('deepDungeon.requiresLevelYou', { level: selection.minimumLevel, you: level })}
        </div>
      </div>
      <RfList height={104} className={`dd-floors${canEnter ? '' : ' locked'}`}>
        <div onPointerLeave={() => setHovered(-1)}>
          {FLOORS.slice(0, selection.floorCount).map((floor, i) => (
            <div
              key={i}
              className={`rf-row dd-floor tier-${DIFFICULTY_TIER[floor.difficulty] ?? 0}${i === selected ? ' selected' : ''}${i === suggested ? ' suggested' : ''}`}
              onPointerEnter={() => setHovered(i)}
              onClick={() => {
                if (i !== selected) playUiSound('click');
                setSelected(i);
              }}
              onDoubleClick={() => {
                setSelected(i);
                if (canEnter) enterDeepDungeon(i + 1);
              }}
            >
              <span className="dd-notch" />
              <span className="dd-floor-label">{t('deepDungeon.floor', { n: i + 1 })}</span>
              <span className="dd-floor-difficulty">{t(`deepDungeon.difficulty.${floor.difficulty}` as TextKey)}</span>
            </div>
          ))}
        </div>
      </RfList>
      <div className={`dd-details tier-${DIFFICULTY_TIER[info.difficulty] ?? 0}`}>
        <div className="dd-detail-head">
          <span className="dd-detail-title">{t('deepDungeon.floor', { n: shown + 1 })}</span>
          <span className="dd-detail-difficulty">{t(`deepDungeon.difficulty.${info.difficulty}` as TextKey)}</span>
        </div>
        <div className="dd-detail-row">
          <span className="dd-detail-label">{t('deepDungeon.monstersLabel')}</span>
          <span className="dd-detail-value">{t('deepDungeon.monsterLevels', { min: info.monsterLevelMin, max: info.monsterLevelMax })}</span>
        </div>
        <div className={`dd-detail-row dd-fit${fit}`}>
          <span className="dd-detail-label">{t('deepDungeon.suggestedLabel')}</span>
          <span className="dd-detail-value">
            {last ? t('deepDungeon.resetsFrom', { min: info.resetsMin }) : t('deepDungeon.resetRange', { min: info.resetsMin, max: info.resetsMax })}
          </span>
        </div>
        <div className="dd-loot">{t(`deepDungeon.loot.${shown}a` as TextKey)}</div>
        <div className="dd-loot">{t(`deepDungeon.loot.${shown}b` as TextKey)}</div>
      </div>
      <div className="dd-actions">
        <RfButton width={120} className="dd-enter" label={t('deepDungeon.enterFloor', { n: selected + 1 })} disabled={!canEnter} onRefused={tryEnter} onClick={tryEnter} />
        <RfButton small label={t('common.close')} onClick={closeDeepDungeon} />
      </div>
    </ReforgeShell>
  );
});

/** The countdown on floors 90-94 (`DeepDungeonHud`): hidden at 0, the warning in the last minute. */
const CountdownHud = observer(() => {
  const now = useNow();
  const scale = useUiStageScale();
  const countdown = DeepDungeon.countdown;
  const map = Ecs.world?.mapIndex ?? -1;
  if (!countdown || map < FIRST_FLOOR_MAP || map > FIRST_FLOOR_MAP + 4) return null;
  const left = secondsLeft(countdown.remainingSeconds, now - DeepDungeon.countdownAtMs);
  if (left <= 0) return null;
  const urgency = hudUrgency(left);
  const offsetX = (window.innerWidth - UI_STAGE_WIDTH * scale) / 2;
  return (
    <div className="dd-hud" style={{ left: offsetX + (UI_STAGE_WIDTH / 2) * scale, top: 40 * scale, transform: `translateX(-50%) scale(${scale})` }}>
      <MuText face="bold" className="dd-hud-line" text={t('deepDungeon.hudFloor', { n: countdown.floor || map - FIRST_FLOOR_MAP + 1 })} color={TEXT_COLOR.brightYellow} />
      <MuText face="bold" className="dd-hud-time" text={mmss(left)} color={URGENCY_COLOR[urgency]} />
      {urgency === 'last' && <MuText className="dd-hud-line" text={t('deepDungeon.hudClosing')} color={URGENCY_COLOR.last} />}
    </div>
  );
});

/** Registered by `window.ts`. */
export const DeepDungeonWindows = observer(() => (
  <>
    <CountdownHud />
    {MuWindows.isOpen(DEEP_DUNGEON_WINDOW) && DeepDungeon.selection && <Window />}
  </>
));
