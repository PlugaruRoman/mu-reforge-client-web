import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { useUiStageScale } from '@/controllers/interface/components/ui_stage';
import { skills, type ActiveBuff } from '@/modules/skills';
import { BUFF_ICON_HEIGHT, BUFF_ICON_WIDTH, buffIconCell } from '@/modules/skills/recipes';
import { t, type TextKey } from '@/i18n';
import type { BuffValue } from '@versions/reforge/packets/buffValues';
import { MsgBox, MsgWinCode } from '@/controllers/interface';
import { skillDisplayName } from '@/controllers/assets';

/** `CNewUIBuffWindow::SetPos(640)`: the row starts at (220, 15). */
const BAR_X = 220;
const BAR_Y = 15;
/** BUFF_IMG_SPACE / BUFF_MAX_LINE_COUNT. */
const ICON_SPACE = 5;
const ICONS_PER_LINE = 8;
/** How often the remaining-time tip is refreshed; the layer clock is not observable. */
const TICK_MS = 500;

/** The value kinds this client has a label for (`buff.value.<kind>`, the server's MagicEffectValuesPacket.ValueKind). */
const LAST_VALUE_KIND = 30;

function formatRemaining(seconds: number): string {
  const s = Math.ceil(seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (days > 0) return t('buff.remainingDay', { days, hours });
  if (hours > 0) return t('buff.remainingHour', { hours, minutes: m });
  return m > 0
    ? t('buff.remainingMin', { minutes: m, seconds: s % 60 })
    : t('buff.remainingSec', { seconds: s });
}

/** "Attack power +312", "Max HP -30%"; null for a kind this client has no label for (a newer server). */
function formatValue(value: BuffValue): string | null {
  if (value.kind < 1 || value.kind > LAST_VALUE_KIND) return null;
  const label = t(`buff.value.${value.kind}` as TextKey);
  const sign = value.amount > 0 ? '+' : '';
  return `${label} ${sign}${value.amount}${value.percent ? '%' : ''}`;
}

/**
 * `RenderBuffTooltip`: the effect's name in bold blue, what it adds as our server computed it (C1 ED 02:
 * green, red when it takes away), then the remaining time the server sent. The half-second refresh lives
 * here, so it only runs while a tip is showing.
 */
const BuffTip = ({ buff, x, y }: { buff: ActiveBuff; x: number; y: number }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const remaining = skills.buffRemaining(buff.id);
  return (
    <div className="buff-tip" style={{ left: x, top: y }}>
      <div className="buff-tip-name">{buff.name}</div>
      {skills.buffValues(buff.id).map((value, i) => {
        const text = formatValue(value);
        return text === null ? null : (
          <div key={i} className={value.amount < 0 ? 'buff-tip-loss' : 'buff-tip-gain'}>
            {text}
          </div>
        );
      })}
      {remaining !== null && <div>{formatRemaining(remaining)}</div>}
      {buff.kind === 'debuff' && <div className="buff-tip-debuff">{t('buff.debuff')}</div>}
    </div>
  );
};

/** A right click on Infinity Arrow or Expansion of Wizardry asks to cancel it (NewUIBuffWindow.cpp:240-253). */
function askCancel(buff: ActiveBuff): void {
  const skill = skills.buffCancelSkill(buff.id);
  if (skill === null) return;
  MsgBox.popUpMsgWin(MsgWinCode.ConfirmCancelBuff, skillDisplayName(skill) ?? buff.name, () => skills.cancelBuff(skill));
}

/**
 * `CNewUIBuffWindow`: the hero's buffs then debuffs (MagicEffectStatus 0x07)
 * as 20×28 cells of `newui_statusicon*.OZJ`, 8 to a line, 5 px apart, in the
 * 640×480 stage. Hovering an icon shows its tip under the icon's centre.
 */
export const BuffBar = observer(() => {
  const buffs = skills.activeBuffs;
  const scale = useUiStageScale();
  const [hovered, setHovered] = useState(-1);

  if (buffs.length === 0) return null;

  return (
    <div
      className="buff-bar"
      style={{ left: BAR_X * scale, top: BAR_Y * scale, transform: `scale(${scale})` }}
    >
      {buffs.map((buff, i) => {
        const x = (i % ICONS_PER_LINE) * (BUFF_ICON_WIDTH + ICON_SPACE);
        const y = Math.floor(i / ICONS_PER_LINE) * (BUFF_ICON_HEIGHT + ICON_SPACE);
        const cell = buffIconCell(buff.id);
        const style = { left: x, top: y, width: BUFF_ICON_WIDTH, height: BUFF_ICON_HEIGHT };
        return (
          <div
            key={buff.id}
            className={`buff ${buff.kind}`}
            style={style}
            onPointerEnter={() => setHovered(buff.id)}
            onPointerLeave={() => setHovered(h => (h === buff.id ? -1 : h))}
            onContextMenu={e => {
              e.preventDefault();
              askCancel(buff);
            }}
          >
            {cell ? (
              <MuSpriteFrame
                file={cell.file}
                x={cell.x}
                y={cell.y}
                width={BUFF_ICON_WIDTH}
                height={BUFF_ICON_HEIGHT}
              />
            ) : (
              <div className="buff-text">{buff.name.slice(0, 3)}</div>
            )}
            {hovered === buff.id && (
              <BuffTip buff={buff} x={BUFF_ICON_WIDTH / 2} y={BUFF_ICON_WIDTH} />
            )}
          </div>
        );
      })}
    </div>
  );
});
