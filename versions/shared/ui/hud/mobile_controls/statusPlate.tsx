import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { Hero } from '@/modules/hero';
import { MuWindows } from '@/controllers/interface/windowManager';
import { MobileButton } from './mobileButton';
import { TouchIcon } from './icons';

const Bar = observer(({ kind, fill, value }: { kind: string; fill: number; value?: string }) => (
  <div className={`touch-bar touch-bar-${kind}`}>
    <div className="touch-bar-fill" style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }} />
    {value && <div className="touch-bar-value">{value}</div>}
  </div>
));

/**
 * The main HUD as a plate in the top left corner (our Android client's mobile `main_frame.rcss`): the
 * portrait with the level (it opens the character window), HP over SD and MP over AG as wide bars,
 * the experience as a thin line under them. The bottom bar is hidden on a phone.
 */
export const StatusPlate = observer(({ compact }: { compact: boolean }) => (
  <div className="touch-status">
    <MobileButton
      className="touch-btn touch-portrait"
      title={t('bottomBar.characterInfo')}
      onTap={() => MuWindows.setOpen('character_info', !MuWindows.isOpen('character_info'))}
    >
      {() => (
        <>
          <TouchIcon name="character" />
          <span className="touch-portrait-level">{Hero.level}</span>
        </>
      )}
    </MobileButton>
    {/* An open window covers most of the screen: the gauges step aside, the portrait stays. */}
    {!compact && (
      <div className="touch-gauges">
        <div className="touch-gauge-pair">
          <Bar kind="hp" fill={Hero.hpPercent} value={`${Hero.currentHP} / ${Hero.maxHP}`} />
          <Bar kind="sd" fill={Hero.sdPercent} />
        </div>
        <div className="touch-gauge-pair">
          <Bar kind="mp" fill={Hero.mpPercent} value={`${Hero.currentMP} / ${Hero.maxMP}`} />
          <Bar kind="ag" fill={Hero.agPercent} />
        </div>
        <Bar kind="exp" fill={Hero.expPercent} />
      </div>
    )}
  </div>
));
