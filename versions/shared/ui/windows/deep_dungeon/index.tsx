import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { Ecs } from '@/ecs/current';
import { MuWindows } from '@/controllers/interface';
import { serverNow } from '@/controllers/net/serverTime';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { useUiStageScale, UI_STAGE_WIDTH } from '@/controllers/interface/components/ui_stage';
import { playUiSound } from '@/controllers/sound/sfx';
import { addNotification } from '@/modules/chat';
import { Hero } from '@/modules/hero';
import {
  DEEP_DUNGEON_WINDOW,
  DeepDungeon,
  FIRST_FLOOR_MAP,
  FLOORS,
  closeDeepDungeon,
  enterDeepDungeon,
  hudUrgency,
  secondsLeft,
  windowUrgency,
  type Urgency,
} from '@/modules/deep_dungeon';

/**
 * The Deep Dungeon: the floor selection the server opens at the Dungeon Guide (C1 E3 01, our client's
 * UI/DeepDungeon/DeepDungeonWindow.cpp, reforge_deep_dungeon.rml) and the countdown HUD inside
 * (E3 03, DeepDungeonHud.cpp). Entering is two steps, so a stray click never teleports: a click on a
 * floor selects it and fills the details below; the Enter button (or a double click) sends E3 02.
 */

const URGENCY_COLOR: Record<Urgency, string> = { calm: TEXT_COLOR.brightGray, soon: TEXT_COLOR.orange, last: 'rgb(255, 90, 70)' };
const DIFFICULTY_COLOR = ['rgb(120, 230, 120)', 'rgb(200, 230, 120)', TEXT_COLOR.orange, 'rgb(255, 130, 60)', 'rgb(255, 80, 80)'];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

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

  const tryEnter = () => {
    playUiSound('click');
    if (!levelOk) {
      // The level line is red already; the click still answers why nothing happens.
      addNotification(t('deepDungeon.levelRequired', { level: selection.minimumLevel }), 'error');
      return;
    }
    if (left > 0) enterDeepDungeon(selected + 1);
  };

  return (
    <MuItemWindow id="deep-dungeon-window" label={t('deepDungeon.title')} onClose={closeDeepDungeon}>
      <MuText face="bold" align="center" className="dd-title" text={t('deepDungeon.title')} />
      <div className="dd-body">
        <MuText
          className="dd-line"
          text={left > 0 ? t('deepDungeon.closesIn', { time: mmss(left) }) : t('deepDungeon.closedNow')}
          color={URGENCY_COLOR[windowUrgency(left)]}
        />
        <MuText
          className="dd-line"
          text={levelOk ? t('deepDungeon.requiresLevel', { level: selection.minimumLevel }) : t('deepDungeon.requiresLevelYou', { level: selection.minimumLevel, you: level })}
          color={levelOk ? TEXT_COLOR.brightGray : 'rgb(255, 90, 70)'}
        />
        <div className="dd-floors" data-no-drag="true" onPointerLeave={() => setHovered(-1)}>
          {FLOORS.slice(0, selection.floorCount).map((floor, i) => (
            <div
              key={i}
              className={`dd-floor${i === selected ? ' selected' : ''}`}
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
              <MuText text={t('deepDungeon.floor', { n: i + 1 })} color={TEXT_COLOR.brightYellow} />
              <MuText text={t(`deepDungeon.difficulty.${floor.difficulty}` as TextKey)} color={DIFFICULTY_COLOR[i]} />
            </div>
          ))}
        </div>
        <div className="dd-details">
          <MuText face="bold" className="dd-line" text={`${t('deepDungeon.floor', { n: shown + 1 })} - ${t(`deepDungeon.difficulty.${info.difficulty}` as TextKey)}`} color={DIFFICULTY_COLOR[shown]} />
          <div className="dd-pair">
            <MuText text={t('deepDungeon.monstersLabel')} color={TEXT_COLOR.orange} />
            <MuText text={t('deepDungeon.monsterLevels', { min: info.monsterLevelMin, max: info.monsterLevelMax })} color={TEXT_COLOR.brightGray} />
          </div>
          <div className="dd-pair">
            <MuText text={t('deepDungeon.suggestedLabel')} color={TEXT_COLOR.orange} />
            <MuText
              text={last ? t('deepDungeon.resetsFrom', { min: info.resetsMin }) : t('deepDungeon.resetRange', { min: info.resetsMin, max: info.resetsMax })}
              color={TEXT_COLOR.brightGray}
            />
          </div>
          <MuText className="dd-line" text={t(`deepDungeon.loot.${shown}a` as TextKey)} color={TEXT_COLOR.brightGray} />
          <MuText className="dd-line" text={t(`deepDungeon.loot.${shown}b` as TextKey)} color={TEXT_COLOR.brightGray} />
        </div>
      </div>
      <div className="dd-enter" data-no-drag="true">
        <MuButton
          file="newui_btn_empty.OZT"
          width={108}
          height={29}
          frames={{ up: 0, active: 1, down: 2 }}
          color={canEnter ? TEXT_COLOR.brightGray : 'rgb(120, 120, 120)'}
          activeColor={TEXT_COLOR.white}
          label={t('deepDungeon.enterFloor', { n: selected + 1 })}
          labelStyle={{ fontSize: 11 }}
          onClick={tryEnter}
          style={canEnter ? undefined : { filter: 'brightness(0.6)' }}
        />
      </div>
    </MuItemWindow>
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
