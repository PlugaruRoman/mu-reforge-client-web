import { useEffect, useState } from 'react';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { Hero } from '@/modules/hero';
import {
  PaidResetResult,
  Payment,
  RESET_WINDOW,
  ResetReason,
  Resets,
  canAfford,
  canPaidReset,
  type PaidReset,
} from '@/modules/resets';
import { ReforgeShell, RfButton, RfButtons } from '../_shared/reforgeShell';
import {
  AccountButton,
  AccountConfirm,
  AccountRow,
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
      <RfButtons>
        <RfButton label={button} disabled={!section.canReset} onClick={onReset} />
      </RfButtons>
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
        <RfButtons>
          <RfButton label={t('resetWin.back')} onClick={onBack} />
        </RfButtons>
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
      <RfButtons>
        <RfButton label={t('resetWin.back')} onClick={onBack} />
      </RfButtons>
    </div>
  );
});

/** The paid page the window shows, if any: module state, so the character window can open it. */
const paidPage = observable.box<PaidReset | null>(null);
const setPaid = (which: PaidReset | null) => runInAction(() => paidPage.set(which));

/** Opens the Reset window on a paid reset (PaidResetDialog.cpp) and asks the server for its prices. */
export function openPaidReset(which: PaidReset): void {
  setPaid(which);
  MuWindows.setOpen(RESET_WINDOW, true);
  Resets.requestPaid(which);
}

/**
 * `CResetWindow` (UI/Reset/ResetWindow.cpp, reforge_reset.rml): 230 wide, as high as its one section:
 * the next character reset or the next grand reset (`Resets.showGrand`), confirmed before the chat
 * command goes out, then Close. The two paid resets our client opens from its character window
 * (PaidResetDialog.cpp) stay on a second page here, reached by two small buttons or `openPaidReset`.
 */
export const ResetWindow = observer(() => {
  const open = MuWindows.isOpen(RESET_WINDOW);
  const showGrand = Resets.showGrand;
  const [confirm, setConfirm] = useState<'reset' | 'grand' | null>(null);
  const paid = paidPage.get();

  useEffect(() => {
    if (!open) {
      // The next open without a kind (the N menu) is the character reset.
      Resets.setShowGrand(false);
      setPaid(null);
      return;
    }
    setConfirm(null);
    Resets.requestInfo(showGrand);
  }, [open, showGrand]);

  const reset = Resets.reset;
  const grand = Resets.grand;
  const openPaid = (which: PaidReset) => {
    setPaid(which);
    Resets.requestPaid(which);
  };
  const paidTitle = paid === 'stats' ? 'resetWin.statsTitle' : 'resetWin.masterTitle';

  return (
    <ReforgeShell
      id={RESET_WINDOW}
      title={t(paid ? paidTitle : showGrand ? 'resetWin.grandTitle' : 'resetWin.title')}
      className="reset-body"
      onClose={() => {
        if (confirm) setConfirm(null);
        else MuWindows.setOpen(RESET_WINDOW, false);
      }}
      overlay={
        confirm && (
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
        )
      }
    >
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
            <RfButtons className="reset-paid-links">
              <RfButton small label={t('resetWin.statsTitle')} title={t('resetWin.statsTooltip')} onClick={() => openPaid('stats')} />
              <RfButton small label={t('resetWin.masterTitle')} title={t('resetWin.masterTitle')} onClick={() => openPaid('master')} />
            </RfButtons>
          </>
        )}
    </ReforgeShell>
  );
});

/**
 * The page the Reset window shows, for the character window's plates (UI/Reforge/ReforgeCharacterButtons.cpp):
 * a paid reset, the character reset or the grand reset; null while it is closed.
 */
export function resetWindowPage(): PaidReset | 'reset' | 'grand' | null {
  if (!MuWindows.isOpen(RESET_WINDOW)) return null;
  return paidPage.get() ?? (Resets.showGrand ? 'grand' : 'reset');
}

/** ReforgeCharacterButtons.cpp `OpenReset`: the Reset window on that reset, off any paid page. */
export function openResetPage(grand: boolean): void {
  setPaid(null);
  Resets.setShowGrand(grand);
  MuWindows.setOpen(RESET_WINDOW, true);
}
