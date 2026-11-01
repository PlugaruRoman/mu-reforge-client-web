import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
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
import { AccountButton, AccountConfirm, amount, type ConfirmLine } from '../_shared/accountWidgets';
import { ReforgeShell, RfButton, RfFooter } from '../_shared/reforgeShell';
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
 * Each attribute's node icon (reforge_soul_points.rcss `icon-N`): the 20x28 cell of the buff that does
 * the same thing, on newui_statusicon (1) or newui_statusicon2 (2).
 */
const ICONS: readonly (readonly [1 | 2, number, number])[] = [
  [1, 0, 0], [2, 180, 0], [2, 160, 0], [1, 100, 112],
  [1, 20, 0], [1, 0, 196], [1, 140, 0], [1, 60, 0],
  [1, 20, 168], [1, 40, 168], [1, 80, 112], [2, 40, 56],
  [1, 0, 112], [1, 180, 84], [2, 0, 56], [2, 120, 0],
];
const ICON_FILE = { 1: 'newui_statusicon.OZJ', 2: 'newui_statusicon2.OZJ' } as const;

/**
 * `CSoulPointWindow` (UI/SoulPoints/SoulPointWindow.cpp, reforge_soul_points.rml), 284 x 432: the balance,
 * the 16 attributes as a tree of four columns (attack, defense, support, misc), the selected one's bonus
 * and milestones with the step buttons, the message line, then Reset | Invest | Close. Invest sends the
 * plan after a confirmation; Reset offers the paid reset.
 */
export const SoulPointWindow = observer(() => {
  const open = MuWindows.isOpen(SOUL_WINDOW);
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

  const detailHint = [
    t('soul.highestOnly'),
    definition.multiplies ? t('soul.multiplies') : '',
    committed > 0 ? t('soul.lockedIn', { points: committed }) : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <ReforgeShell
      id={SOUL_WINDOW}
      title={t('soul.title')}
      hotKey={HOT_KEY}
      width={284}
      height={432}
      closeButton={false}
      className="soul-body"
      onClose={() => {
        if (dialog) setDialog(null);
        else MuWindows.setOpen(SOUL_WINDOW, false);
      }}
      overlay={
        <>
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
        </>
      }
    >
      <div className="soul-balance">
        <div className="soul-cell">
          <span className="soul-cell-label">{t('soul.available')}</span>
          <span className="soul-cell-value">{amount(SoulPoints.left)}</span>
        </div>
        <div className="soul-cell">
          <span className="soul-cell-label">{t('soul.invested')}</span>
          <span className="soul-cell-value">{amount(SoulPoints.investedTotal)}</span>
        </div>
        <div className="soul-cell soul-pending">
          <span className="soul-cell-label">{t('soul.pending')}</span>
          <span className="soul-cell-value">{amount(SoulPoints.pendingTotal)}</span>
        </div>
      </div>
      <div className="soul-tree">
        {CATEGORIES.map((key, c) => (
          <div key={key} className={`soul-column category-${c}`}>
            <div className="soul-column-name">{t(key)}</div>
            {Array.from({ length: PER_CATEGORY }, (_, i) => c * PER_CATEGORY + i).map(a => {
              const points = SoulPoints.planned[a];
              const milestone = reachedMilestone(a, points);
              const [file, x, y] = ICONS[a];
              const classes = [
                'soul-node',
                selected === a ? 'selected' : '',
                SoulPoints.allocated[a] > 0 ? 'invested' : '',
                points > SoulPoints.allocated[a] ? 'pending' : '',
                points >= SoulPoints.caps[a] ? 'maxed' : '',
                milestone >= 0 ? `milestone-${milestone + 1}` : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={a}
                  className={classes}
                  title={attrName(a)}
                  onClick={() => {
                    if (selected !== a) playUiSound('click');
                    setSelected(a);
                  }}
                >
                  <div className="soul-slot">
                    <MuSpriteFrame file={ICON_FILE[file]} x={x} y={y} width={20} height={28} className="soul-icon" />
                  </div>
                  <div className="soul-node-points">
                    {points}/{SoulPoints.caps[a]}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="soul-detail" title={detailHint}>
        <div className="soul-detail-head">
          <span className="soul-detail-name">{attrName(selected)}</span>
          <span className="soul-detail-points">{`${planned} / ${cap}`}</span>
        </div>
        <div className="soul-bar">
          <div className="soul-bar-planned" style={{ width: `${(planned / Math.max(1, cap)) * 100}%` }} />
          <div className="soul-bar-committed" style={{ width: `${(committed / Math.max(1, cap)) * 100}%` }} />
        </div>
        <div className="soul-detail-line soul-now">{t('soul.now', { bonus: primaryText(selected, planned), what: attrWhat(selected) })}</div>
        <div className="soul-detail-line soul-milestone">
          {reached >= 0 ? t('soul.milestoneActive', { bonus: milestoneText(selected, reached), what: milestoneWhat(selected) }) : ''}
        </div>
        <div className="soul-detail-line soul-next">{nextMilestone(selected, planned)}</div>
        <div className="soul-steps">
          {STEPS.map(delta => (
            <AccountButton key={delta} className="soul-step" label={delta > 0 ? `+${delta}` : String(delta)} onClick={() => stepBy(delta)} />
          ))}
        </div>
      </div>
      <RfFooter className={`soul-message${message?.good ? ' good' : ''}`}>{message?.text ?? ''}</RfFooter>
      <div className="soul-actions">
        <RfButton
          small
          label={t('soul.reset')}
          disabled={SoulPoints.investedTotal === 0}
          onRefused={() => setMessage({ text: t('soul.nothingInvested'), good: false })}
          onClick={() => setDialog('reset')}
        />
        <RfButton
          small
          label={t('soul.invest')}
          disabled={!SoulPoints.known || SoulPoints.pendingTotal === 0}
          onRefused={() => setMessage({ text: t('soul.nothingSpent'), good: false })}
          onClick={() => setDialog('invest')}
        />
        <RfButton small label={t('common.close')} onClick={() => MuWindows.setOpen(SOUL_WINDOW, false)} />
      </div>
    </ReforgeShell>
  );
});
