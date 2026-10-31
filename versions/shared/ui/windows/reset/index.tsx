import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { ModuleWindowFrame } from '@/controllers/interface/components/module_window';
import { moduleOn } from '@/modules/module';
import { Hero } from '@/modules/hero';
import {
  ADD_STATS_WINDOW,
  PaidResetResult,
  Payment,
  RESET_WINDOW,
  ResetReason,
  Resets,
  canAfford,
  canPaidReset,
  type PaidReset,
} from '@/modules/resets';
import { SOUL_WINDOW } from '@/modules/soul_points';
import {
  AccountBody,
  AccountButton,
  AccountConfirm,
  AccountRow,
  AccountTabStrip,
  amount,
} from '../_shared/accountWidgets';
import './style.less';

/** ResetTexts.cpp `ReasonText`. */
const REASON: Record<ResetReason, TextKey> = {
  [ResetReason.Ok]: 'resetWin.failOther',
  [ResetReason.FeatureDisabled]: 'resetWin.failNotEnabled',
  [ResetReason.LevelTooLow]: 'resetWin.failLevel',
  [ResetReason.LimitReached]: 'resetWin.failLimit',
  [ResetReason.NotEnoughZen]: 'resetWin.failZen',
  [ResetReason.NotEnoughItems]: 'resetWin.failItem',
  [ResetReason.NotEnoughResets]: 'resetWin.failResets',
};

/** ResetTexts.cpp `ResultText`. */
const RESULT: Record<PaidResetResult, TextKey> = {
  [PaidResetResult.Success]: 'resetWin.paidDone',
  [PaidResetResult.FeatureDisabled]: 'resetWin.failNotEnabled',
  [PaidResetResult.InvalidPayment]: 'resetWin.failPayment',
  [PaidResetResult.NotAvailable]: 'resetWin.failCloseWindows',
  [PaidResetResult.NotInSafezone]: 'resetWin.failSafeZone',
  [PaidResetResult.LevelTooLow]: 'resetWin.failLevel',
  [PaidResetResult.NothingToReset]: 'resetWin.failNoPoints',
  [PaidResetResult.NotEnoughWCoin]: 'resetWin.failWCoin',
  [PaidResetResult.NotEnoughJewels]: 'resetWin.failJewels',
  [PaidResetResult.NotEnoughZenOrItems]: 'resetWin.failZenOrItems',
  [PaidResetResult.NotMasterClass]: 'resetWin.failMasterOnly',
};

const zen = (n: number) => t('resetWin.zen', { amount: amount(n) });
const progress = (current: number, required: number) => `${current} / ${required}`;

type Section = { heading: string; requiredLevel: number; requiredZen: number; canReset: boolean; reason: ResetReason; resets?: [number, number] } | null;

/** One section of reforge_reset.rml: the rows the player meets or not, the status and the button. */
const ResetSection = observer(({ section, loadingHeading, button, okText, onReset }: { section: Section; loadingHeading: string; button: string; okText: string; onReset: () => void }) => {
  if (!section) {
    return (
      <div className="acct-section">
        <div className="acct-heading">{loadingHeading}</div>
        <div className="acct-hint">{t('resetWin.loading')}</div>
      </div>
    );
  }
  return (
    <div className="acct-section">
      <div className="acct-heading">{section.heading}</div>
      {section.resets && (
        <AccountRow label={t('resetWin.resets')} value={progress(...section.resets)} met={section.resets[0] >= section.resets[1]} />
      )}
      <AccountRow label={t('resetWin.level')} value={progress(Hero.level, section.requiredLevel)} met={Hero.level >= section.requiredLevel} />
      <AccountRow label={t('resetWin.cost')} value={zen(section.requiredZen)} />
      <AccountRow label={t('resetWin.yourZen')} value={zen(Hero.money)} met={Hero.money >= section.requiredZen} />
      <div className={`acct-message${section.canReset ? ' good' : ''}`}>
        {section.canReset ? okText : t(REASON[section.reason] ?? 'resetWin.failOther')}
      </div>
      <div className="acct-buttons">
        <AccountButton label={button} disabled={!section.canReset} onClick={onReset} />
      </div>
    </div>
  );
});

/** The paid stat / master tree reset (UI/Reset/PaidResetDialog.cpp): refund, both prices against the balances, the status. */
const PaidPanel = observer(({ reset, onBack }: { reset: PaidReset; onBack: () => void }) => {
  const info = Resets.paid[reset];
  const answer = Resets.paidResult?.reset === reset ? Resets.paidResult.result : null;
  const title = t(reset === 'stats' ? 'resetWin.statsTitle' : 'resetWin.masterTitle');
  if (!info) {
    return (
      <div className="acct-section">
        <div className="acct-heading">{title}</div>
        <div className="acct-hint">{t('resetWin.loading')}</div>
        {answer !== null && <div className={`acct-message${answer === PaidResetResult.Success ? ' good' : ''}`}>{t(RESULT[answer])}</div>}
        <div className="acct-buttons">
          <AccountButton label={t('resetWin.back')} onClick={onBack} />
        </div>
      </div>
    );
  }
  const can = canPaidReset(info);
  const wcoinPrice = t('resetWin.priceWCoin', { wcoin: amount(info.costs[0]) });
  const jewelPrice = t('resetWin.priceJewels', { bless: amount(info.costs[1]), soul: amount(info.costs[2]) });
  const status = can
    ? t(reset === 'stats' ? 'resetWin.confirmStats' : 'resetWin.confirmMaster')
    : info.precondition === PaidResetResult.LevelTooLow
      ? t('resetWin.requiresLevel', { level: info.requiredLevel })
      : t(RESULT[info.precondition === PaidResetResult.Success ? PaidResetResult.NothingToReset : info.precondition]);
  return (
    <div className="acct-section">
      <div className="acct-heading">{title}</div>
      <AccountRow label={t(reset === 'stats' ? 'resetWin.refund' : 'resetWin.masterRefund')} value={amount(info.refundable)} />
      <div className="acct-heading reset-payment">{t('resetWin.payment')}</div>
      <AccountRow label={wcoinPrice} value={t('resetWin.youHave', { amount: amount(info.balances[0]) })} met={canAfford(info, Payment.WCoin)} />
      <AccountRow
        label={jewelPrice}
        value={t('resetWin.youHaveTwo', { bless: amount(info.balances[1]), soul: amount(info.balances[2]) })}
        met={canAfford(info, Payment.Jewels)}
      />
      <div className={`acct-message${can ? ' good' : ''}`}>{status}</div>
      {answer !== null && answer !== PaidResetResult.Success && <div className="acct-message">{t(RESULT[answer])}</div>}
      {answer === PaidResetResult.Success && <div className="acct-message good">{t('resetWin.paidDone')}</div>}
      <div className="acct-buttons reset-pay">
        <AccountButton label={wcoinPrice} disabled={!can || !canAfford(info, Payment.WCoin)} onClick={() => Resets.payPaid(reset, Payment.WCoin)} />
        <AccountButton label={jewelPrice} disabled={!can || !canAfford(info, Payment.Jewels)} onClick={() => Resets.payPaid(reset, Payment.Jewels)} />
      </div>
      <div className="acct-buttons">
        <AccountButton label={t('resetWin.back')} onClick={onBack} />
      </div>
    </div>
  );
});

/**
 * `CResetWindow` (UI/Reset/ResetWindow.cpp, reforge_reset.rml): the next character reset or the next
 * grand reset, one at a time (`Resets.showGrand`), confirmed before the chat command goes out, and the
 * two paid resets our client offers from its character window (PaidResetDialog.cpp) on a second page.
 */
export const ResetWindow = observer(() => {
  const open = MuWindows.isOpen(RESET_WINDOW);
  const showGrand = Resets.showGrand;
  const [confirm, setConfirm] = useState<'reset' | 'grand' | null>(null);
  const [paid, setPaid] = useState<PaidReset | null>(null);

  useEffect(() => {
    if (!open) {
      // The next open without a kind (the N menu) is the character reset.
      Resets.setShowGrand(false);
      return;
    }
    setConfirm(null);
    setPaid(null);
    Resets.requestInfo(showGrand);
  }, [open, showGrand]);

  const reset = Resets.reset;
  const grand = Resets.grand;
  const openPaid = (which: PaidReset) => {
    setPaid(which);
    Resets.requestPaid(which);
  };

  return (
    <ModuleWindowFrame id={RESET_WINDOW} title={t(showGrand ? 'resetWin.grandTitle' : 'resetWin.title')}>
      <AccountBody className="reset-body">
        {paid ? (
          <PaidPanel reset={paid} onBack={() => setPaid(null)} />
        ) : (
          <>
            {showGrand ? (
              <ResetSection
                loadingHeading={t('resetWin.grandTitle')}
                button={t('resetWin.grandTitle')}
                okText={t('resetWin.confirmGrand')}
                section={
                  grand && {
                    ...grand,
                    heading:
                      grand.limit > 0
                        ? t('resetWin.grandCountLimited', { count: grand.currentGrandResets + 1, limit: grand.limit })
                        : t('resetWin.grandCount', { count: grand.currentGrandResets + 1 }),
                    resets: [grand.currentResets, grand.requiredResets],
                  }
                }
                onReset={() => setConfirm('grand')}
              />
            ) : (
              <ResetSection
                loadingHeading={t('resetWin.characterTitle')}
                button={t('resetWin.reset')}
                okText={t('resetWin.confirmReset')}
                section={reset && { ...reset, heading: t('resetWin.nextReset', { count: reset.currentResets + 1 }) }}
                onReset={() => setConfirm('reset')}
              />
            )}
            <div className="acct-buttons">
              <AccountButton label={t('resetWin.statsTitle')} title={t('resetWin.statsTooltip')} onClick={() => openPaid('stats')} />
              <AccountButton label={t('resetWin.masterTitle')} onClick={() => openPaid('master')} />
            </div>
          </>
        )}
      </AccountBody>
      {confirm && (
        <AccountConfirm
          lines={[
            { text: t(confirm === 'grand' ? 'resetWin.grandTitle' : 'resetWin.characterTitle'), bold: true },
            { text: t(confirm === 'grand' ? 'resetWin.confirmGrand' : 'resetWin.confirmReset') },
            { text: `${t('resetWin.cost')}: ${zen((confirm === 'grand' ? grand : reset)?.requiredZen ?? 0)}` },
          ]}
          buttons={[
            {
              label: t(confirm === 'grand' ? 'resetWin.grandTitle' : 'resetWin.reset'),
              onClick: () => {
                // Only the reset the window shows (`ConfirmReset`): a switch under an open confirm drops it.
                if ((confirm === 'grand') === Resets.showGrand) Resets.doReset(confirm === 'grand');
                setConfirm(null);
                MuWindows.setOpen(RESET_WINDOW, false);
              },
            },
            { label: t('resetWin.cancel'), onClick: () => setConfirm(null) },
          ]}
        />
      )}
    </ModuleWindowFrame>
  );
});

const toggle = (id: string) => MuWindows.setOpen(id, !MuWindows.isOpen(id));

/**
 * ReforgeCharacterButtons.cpp `OpenReset`: shows the Reset window on that reset, or switches an open
 * one to it. The button of the reset already shown closes it, as the other tabs do.
 */
function toggleReset(grand: boolean): void {
  if (MuWindows.isOpen(RESET_WINDOW) && Resets.showGrand === grand) {
    MuWindows.setOpen(RESET_WINDOW, false);
    return;
  }
  Resets.setShowGrand(grand);
  MuWindows.setOpen(RESET_WINDOW, true);
}

/**
 * Our client's buttons on the character window (UI/Reforge/ReforgeCharacterButtons.cpp): Add Stats,
 * the Reset window on the character reset or on the grand reset, and the Soul Point window. Drawn as
 * tabs over the character window's frame; only on a world with the module on.
 */
export const ResetCharacterButtons = observer(() => {
  if (!moduleOn('resets')) return null;
  const resetOpen = MuWindows.isOpen(RESET_WINDOW);
  return (
    <AccountTabStrip>
      <AccountButton label={t('resetWin.addStats')} active={MuWindows.isOpen(ADD_STATS_WINDOW)} onClick={() => toggle(ADD_STATS_WINDOW)} />
      <AccountButton label={t('resetWin.title')} active={resetOpen && !Resets.showGrand} onClick={() => toggleReset(false)} />
      <AccountButton label={t('resetWin.grandTitle')} active={resetOpen && Resets.showGrand} onClick={() => toggleReset(true)} />
      {moduleOn('soul_points') && (
        <AccountButton label={t('resetWin.soul')} active={MuWindows.isOpen(SOUL_WINDOW)} onClick={() => toggle(SOUL_WINDOW)} />
      )}
    </AccountTabStrip>
  );
});
