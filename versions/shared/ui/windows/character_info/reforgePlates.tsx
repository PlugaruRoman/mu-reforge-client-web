import { useEffect, useRef, useState } from 'react';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { moduleOn } from '@/modules/module';
import { Hero } from '@/modules/hero';
import { getStatName, type StatType } from '@/modules/hero/characterStats';
import {
  ADD_STATS_WINDOW,
  MAX_AMOUNT_PER_REQUEST,
  RESET_WINDOW,
  Resets,
} from '@/modules/resets';
import { AccountButton } from '../_shared/accountWidgets';
import { SidePlate } from '../_shared/sidePlates';
import { openPaidReset, openResetPage, resetWindowPage } from '../reset';

/**
 * Our client's plates beside the character window (character_info.rml:108-113,
 * themes/legacy/character_info.rcss `.reforge-plate`, UI/Reforge/ReforgeCharacterButtons.cpp): Add Stats,
 * Reset Stats (the paid stat reset), Reset and Grand Reset, top to bottom at 33 px, the last one level
 * with the bottom row. Only on a world with our resets.
 */
const PLATE_TOPS = [293, 326, 359, 392] as const;

/** The plate of the page already shown closes the window, as the window's own buttons do. */
function togglePage(page: 'stats' | 'reset' | 'grand'): void {
  if (resetWindowPage() === page) {
    MuWindows.setOpen(RESET_WINDOW, false);
    return;
  }
  if (page === 'stats') openPaidReset('stats');
  else openResetPage(page === 'grand');
}

export const CharacterPlates = observer(() => {
  if (!moduleOn('resets')) return null;
  const page = resetWindowPage();
  return (
    <>
      <SidePlate
        top={PLATE_TOPS[0]}
        file="newui_chainfo_btn_addstats.OZT"
        title={t('resetWin.addStats')}
        description={t('charInfo.plateAddStatsTip')}
        active={MuWindows.isOpen(ADD_STATS_WINDOW)}
        onClick={() =>
          MuWindows.setOpen(
            ADD_STATS_WINDOW,
            !MuWindows.isOpen(ADD_STATS_WINDOW)
          )
        }
      />
      <SidePlate
        top={PLATE_TOPS[1]}
        file="newui_chainfo_btn_resetstats.OZT"
        title={t('resetWin.statsTitle')}
        description={t('resetWin.statsTooltip')}
        active={page === 'stats'}
        onClick={() => togglePage('stats')}
      />
      <SidePlate
        top={PLATE_TOPS[2]}
        file="newui_chainfo_btn_reset.OZT"
        title={t('resetWin.title')}
        description={t('charInfo.plateResetTip')}
        active={page === 'reset'}
        onClick={() => togglePage('reset')}
      />
      <SidePlate
        top={PLATE_TOPS[3]}
        file="newui_chainfo_btn_grandreset.OZT"
        title={t('resetWin.grandTitle')}
        description={t('charInfo.plateGrandResetTip')}
        active={page === 'grand'}
        onClick={() => togglePage('grand')}
      />
    </>
  );
});

/** The stat whose "how many points" prompt is up. */
const promptStat = observable.box<StatType | null>(null);

/** True on a world whose `+` asks for an amount (our server takes many points in one F3 06). */
export const statPromptOn = (): boolean => moduleOn('resets');

/** ReforgeCharacterButtons.cpp `OpenAddStatPointDialog`: the `+` of a stat row. */
export function openStatPrompt(stat: StatType): void {
  if (Hero.points <= 0) return;
  runInAction(() => promptStat.set(stat));
}

export function closeStatPrompt(): void {
  runInAction(() => promptStat.set(null));
}

/** `StatPoints::PromptAmount`: what was typed, capped by the free points and one request's limit. */
export function promptAmount(typed: number, available: number): number {
  if (!(typed > 0) || available <= 0) return 0;
  return Math.min(Math.trunc(typed), available, MAX_AMOUNT_PER_REQUEST);
}

/**
 * The prompt over the character window: "STR (123)" in gold - the stat and the free points - and a
 * box of up to five digits. OK sends that many points at once (`Resets.addPoints`), measured again at
 * the press since a level up may have changed the free points; it closes on its own when they run out.
 */
export const StatPointPrompt = observer(() => {
  const stat = promptStat.get();
  const [typed, setTyped] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const points = Hero.points;

  useEffect(() => {
    setTyped('');
    if (stat !== null) input.current?.focus({ preventScroll: true });
  }, [stat]);

  useEffect(() => {
    if (stat !== null && points <= 0) closeStatPrompt();
  }, [stat, points]);

  if (stat === null) return null;

  const ok = () => {
    const amount = promptAmount(Number(typed), Hero.points);
    closeStatPrompt();
    if (amount > 0) Resets.addPoints(stat, amount);
  };

  return (
    <div className="acct-confirm stat-prompt" data-no-drag="true">
      <div className="acct-confirm-box">
        <div className="acct-confirm-line bold">{`${getStatName(stat)} (${points})`}</div>
        <input
          ref={input}
          className="acct-field stat-prompt-field"
          inputMode="numeric"
          spellCheck={false}
          maxLength={5}
          value={typed}
          onChange={event =>
            setTyped(event.target.value.replace(/[^0-9]/g, '').slice(0, 5))
          }
          onKeyDown={event => {
            if (event.key === 'Enter') ok();
            else if (event.key === 'Escape') closeStatPrompt();
            else return;
            event.preventDefault();
            event.stopPropagation();
          }}
        />
        <div className="acct-confirm-buttons">
          <AccountButton
            label={t('common.ok')}
            disabled={!(Number(typed) > 0)}
            onClick={ok}
          />
          <AccountButton label={t('common.cancel')} onClick={closeStatPrompt} />
        </div>
      </div>
    </div>
  );
});
