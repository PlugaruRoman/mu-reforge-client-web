import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { ModuleWindowFrame } from '@/controllers/interface/components/module_window';
import { playUiSound } from '@/controllers/sound/sfx';
import {
  MILESTONE_COUNT,
  PER_CATEGORY,
  SOUL_DEFINITIONS,
  SOUL_WINDOW,
  SoulPayment,
  SoulPoints,
  SoulResetResult,
  primaryValue,
  reachedMilestone,
} from '@/modules/soul_points';
import { AccountBody, AccountButton, AccountConfirm, AccountRow, amount, type ConfirmLine } from '../_shared/accountWidgets';
import './style.less';

/** Our client's key S (UI/Reforge/ReforgeHotkeys.cpp); Babylon's bag sort holds S unless rebound. */
const HOT_KEY = 'KeyS';
/** The step buttons (SoulPointWindow.cpp `StepDeltas`). */
const STEPS = [-10, -1, 1, 10] as const;

const CATEGORIES: readonly TextKey[] = ['soul.attack', 'soul.defense', 'soul.support', 'soul.misc'];
const attrName = (a: number) => t(`soul.attr.${a}` as TextKey);
const attrWhat = (a: number) => t(`soul.what.${a}` as TextKey);
/** The excellent and critical milestones name extra damage, not a chance (SoulPointText.cpp). */
const milestoneWhat = (a: number) => t((a === 1 || a === 2 || a === 5 || a === 8 || a === 9 ? `soul.milestoneWhat.${a}` : `soul.what.${a}`) as TextKey);

/** `+15%`, `+2.5%`, `-0.75%` or `+180` (SoulPointText.cpp `Value`). */
function value(v: number, flat: boolean, reduction: boolean): string {
  const sign = reduction ? '-' : '+';
  if (flat) return `${sign}${Math.round(v)}`;
  const rounded = Math.round(v * 100 * 100) / 100;
  return `${sign}${Number.isInteger(rounded) ? rounded : Number.isInteger(rounded * 10) ? rounded.toFixed(1) : rounded.toFixed(2)}%`;
}

const primaryText = (a: number, points: number) => {
  const d = SOUL_DEFINITIONS[a];
  return value(primaryValue(a, points), d.flat, d.reduction);
};
const milestoneText = (a: number, m: number) => {
  const d = SOUL_DEFINITIONS[a];
  return value(d.milestones[m], d.flat, d.reduction);
};

/** `NextMilestoneText`. */
function nextMilestone(a: number, points: number): string {
  const d = SOUL_DEFINITIONS[a];
  for (let m = 0; m < MILESTONE_COUNT; m++) {
    const threshold = d.thresholds[m];
    if (points >= threshold) continue;
    return t('soul.next', { at: threshold, more: threshold - points, bonus: milestoneText(a, m), what: milestoneWhat(a) });
  }
  return t('soul.allMilestones');
}

const RESET_ANSWER: Record<SoulResetResult, TextKey> = {
  [SoulResetResult.Success]: 'soul.resetDone',
  [SoulResetResult.InvalidPayment]: 'soul.unknownPayment',
  [SoulResetResult.NothingToReset]: 'soul.nothingInvested',
  [SoulResetResult.NotEnoughWCoinC]: 'soul.noWCoinC',
  [SoulResetResult.NotEnoughWCoinP]: 'soul.noWCoinP',
  [SoulResetResult.NotEnoughJewels]: 'soul.noBless',
};

const PAYMENTS: readonly { payment: SoulPayment; name: TextKey; unit: TextKey }[] = [
  { payment: SoulPayment.WCoinC, name: 'soul.payWCoinC', unit: 'soul.unitWCoinC' },
  { payment: SoulPayment.WCoinP, name: 'soul.payWCoinP', unit: 'soul.unitWCoinP' },
  { payment: SoulPayment.Bless, name: 'soul.payBless', unit: 'soul.unitBless' },
];

type Message = { text: string; good: boolean } | null;

/**
 * `CSoulPointWindow` (UI/SoulPoints/SoulPointWindow.cpp, reforge_soul_points.rml): the balance, the 16
 * attributes in their four categories, the selected one's bonus and milestones with the step
 * buttons. Invest sends the plan after a confirmation; Reset offers the paid reset.
 */
export const SoulPointWindow = observer(() => {
  const open = MuWindows.isOpen(SOUL_WINDOW);
  const [category, setCategory] = useState(0);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState<Message>(null);
  const [dialog, setDialog] = useState<'invest' | 'reset' | null>(null);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setDialog(null);
    SoulPoints.requestInfo();
  }, [open]);

  // The reset's answer, as its message line.
  const lastReset = SoulPoints.lastReset;
  useEffect(() => {
    if (lastReset !== null) setMessage({ text: t(RESET_ANSWER[lastReset] ?? 'soul.resetFailed'), good: lastReset === SoulResetResult.Success });
  }, [lastReset]);

  const committed = SoulPoints.allocated[selected];
  const planned = SoulPoints.planned[selected];
  const cap = SoulPoints.caps[selected];
  const definition = SOUL_DEFINITIONS[selected];
  const reached = reachedMilestone(selected, planned);

  const stepBy = (delta: number) => {
    if (SoulPoints.stepPlan(selected, delta)) {
      setMessage(null);
      return;
    }
    playUiSound('error');
    setMessage({
      text: t(delta < 0 ? 'soul.nothingToTakeBack' : SoulPoints.left === 0 ? 'soul.noPointsLeft' : 'soul.atCap'),
      good: false,
    });
  };

  const investLines = (): ConfirmLine[] => [
    { text: t('soul.confirmTitle'), bold: true },
    { text: t('soul.spendingOf', { spent: SoulPoints.pendingTotal, available: SoulPoints.available }) },
    ...SoulPoints.planned.flatMap((p, a) =>
      p > SoulPoints.allocated[a] ? [{ text: `${attrName(a)}  +${p - SoulPoints.allocated[a]} -> ${p}` }] : []
    ),
    { text: t('soul.lockedForGood') },
    { text: t('soul.freeingCosts') },
  ];

  return (
    <ModuleWindowFrame id={SOUL_WINDOW} title={t('soul.title')} hotKey={HOT_KEY}>
      <AccountBody className="soul-body">
        <div className="soul-balance">
          <span>
            {t('soul.available')} <b>{amount(SoulPoints.left)}</b>
          </span>
          <span>
            {t('soul.invested')} <b>{amount(SoulPoints.investedTotal)}</b>
          </span>
          <span className="soul-pending">
            {t('soul.pending')} <b>{amount(SoulPoints.pendingTotal)}</b>
          </span>
        </div>
        <div className="acct-buttons soul-tabs">
          {CATEGORIES.map((key, c) => (
            <AccountButton
              key={key}
              label={t(key)}
              active={category === c}
              onClick={() => {
                setCategory(c);
                setSelected(c * PER_CATEGORY);
              }}
            />
          ))}
        </div>
        {Array.from({ length: PER_CATEGORY }, (_, i) => category * PER_CATEGORY + i).map(a => {
          const points = SoulPoints.planned[a];
          const milestone = reachedMilestone(a, points);
          return (
            <div
              key={a}
              className={`soul-node${selected === a ? ' selected' : ''}${points > SoulPoints.allocated[a] ? ' pending' : ''}${points >= SoulPoints.caps[a] ? ' maxed' : ''}`}
              data-no-drag="true"
              onClick={() => {
                if (selected !== a) playUiSound('click');
                setSelected(a);
              }}
            >
              <span className="soul-node-name">{attrName(a)}</span>
              <span className={`soul-node-milestone m${milestone + 1}`}>{'*'.repeat(milestone + 1)}</span>
              <span className="soul-node-points">
                {points} / {SoulPoints.caps[a]}
              </span>
            </div>
          );
        })}
        <div className="acct-section soul-detail" title={t('soul.highestOnly')}>
          <AccountRow label={attrName(selected)} value={`${planned} / ${cap}`} />
          <div className="acct-bar">
            <div style={{ width: `${(planned / Math.max(1, cap)) * 100}%` }} />
          </div>
          <div className="soul-line">{t('soul.now', { bonus: primaryText(selected, planned), what: attrWhat(selected) })}</div>
          <div className="soul-line soul-milestone">
            {reached >= 0 ? t('soul.milestoneActive', { bonus: milestoneText(selected, reached), what: milestoneWhat(selected) }) : ''}
          </div>
          <div className="soul-line soul-next">{nextMilestone(selected, planned)}</div>
          {definition.multiplies && <div className="soul-line acct-hint">{t('soul.multiplies')}</div>}
          {committed > 0 && <div className="soul-line acct-hint">{t('soul.lockedIn', { points: committed })}</div>}
          <div className="acct-buttons">
            {STEPS.map(delta => (
              <AccountButton key={delta} label={delta > 0 ? `+${delta}` : String(delta)} onClick={() => stepBy(delta)} />
            ))}
          </div>
        </div>
        <div className={`acct-message${message?.good ? ' good' : ''}`}>{message?.text ?? ''}</div>
        <div className="acct-buttons">
          <AccountButton
            label={t('soul.reset')}
            disabled={SoulPoints.investedTotal === 0}
            onRefused={() => setMessage({ text: t('soul.nothingInvested'), good: false })}
            onClick={() => setDialog('reset')}
          />
          <AccountButton
            label={t('soul.invest')}
            disabled={!SoulPoints.known || SoulPoints.pendingTotal === 0}
            onRefused={() => setMessage({ text: t('soul.nothingSpent'), good: false })}
            onClick={() => setDialog('invest')}
          />
        </div>
      </AccountBody>
      {dialog === 'invest' && (
        <AccountConfirm
          lines={investLines()}
          buttons={[
            {
              label: t('soul.invest'),
              onClick: () => {
                SoulPoints.invest();
                setDialog(null);
              },
            },
            { label: t('soul.cancel'), onClick: () => setDialog(null) },
          ]}
        />
      )}
      {dialog === 'reset' && (
        <AccountConfirm
          lines={[
            { text: t('soul.resetTitle'), bold: true },
            { text: t('soul.resetFrees', { points: SoulPoints.investedTotal }) },
            { text: t('soul.howToPay') },
          ]}
          buttons={[
            ...PAYMENTS.map(({ payment, name, unit }) => ({
              label: `${t(name)}: ${amount(SoulPoints.costs[payment])} ${t(unit)}`,
              title: t(payment === SoulPayment.Bless ? 'soul.youHaveBank' : 'soul.youHave', { amount: amount(SoulPoints.balances[payment]) }),
              disabled: SoulPoints.balances[payment] < SoulPoints.costs[payment],
              onClick: () => {
                SoulPoints.reset(payment);
                setDialog(null);
              },
            })),
            { label: t('soul.cancel'), onClick: () => setDialog(null) },
          ]}
        />
      )}
    </ModuleWindowFrame>
  );
});

