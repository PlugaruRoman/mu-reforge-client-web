import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { ModuleWindowFrame } from '@/controllers/interface/components/module_window';
import { ALL_INCLUSIVE, DURATION_DAYS, TIER_COUNT, VIP_WINDOW, Vip, VipBuyResult } from '@/modules/vip';
import { AccountBody, AccountButton, AccountConfirm, amount, type ConfirmLine } from '../_shared/accountWidgets';
import './style.less';

/** Our client's key K (UI/Reforge/ReforgeHotkeys.cpp); Babylon's skill list holds K unless rebound. */
const HOT_KEY = 'KeyK';
/** An open window asks for fresh times this often; a purchase line stays this long (VipShopWindow.cpp). */
const STATUS_INTERVAL_MS = 60_000;
const MESSAGE_MS = 6000;

const TIER_KEYS = ['experience', 'drop', 'craft', 'all'] as const;
const tierName = (tier: number) => t(`vipShop.tier.${TIER_KEYS[tier]}` as TextKey);
const tierShort = (tier: number) => t(`vipShop.short.${TIER_KEYS[tier]}` as TextKey);
const tierDesc = (tier: number, line: 1 | 2) => t(`vipShop.desc.${TIER_KEYS[tier]}${line}` as TextKey);

/** `%ud %uh` / `%uh %um` / `%um` (VipShopText.cpp `Remaining`). */
function remainingText(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return t('vipShop.daysHours', { days, hours });
  if (hours > 0) return t('vipShop.hoursMinutes', { hours, minutes });
  return t('vipShop.minutes', { minutes });
}

const BUY_ANSWER: Partial<Record<VipBuyResult, TextKey>> = {
  [VipBuyResult.Success]: 'vipShop.activated',
  [VipBuyResult.NotEnoughMoney]: 'vipShop.notEnoughWCoin',
  [VipBuyResult.Conflict]: 'vipShop.coveredByAll',
  [VipBuyResult.InvalidTier]: 'vipShop.invalidTier',
};

function refusalText(tier: number, now: number): string {
  switch (Vip.refusal(tier, now)) {
    case 'included':
      return t('vipShop.includedInAll');
    case 'loading':
      return t('vipShop.loadingPrices');
    case 'wcoin':
      return t('vipShop.needMore', { amount: amount(Vip.prices[tier] - Vip.wcoin) });
    default:
      return '';
  }
}

function activeSummary(now: number): string {
  const active = Array.from({ length: TIER_COUNT }, (_, tier) => tier).filter(tier => Vip.isActive(tier, now));
  return active.length ? active.map(tierShort).join(' + ') : t('vipShop.none');
}

/** The confirmation of a purchase (`ConfirmPurchase`): All Inclusive over running single tiers says what it replaces. */
function confirmLines(tier: number, now: number): ConfirmLine[] {
  const price = amount(Vip.prices[tier]);
  if (Vip.replacesSingles(tier, now)) {
    return [
      { text: t('vipShop.replaceTitle'), bold: true },
      { text: t('vipShop.replaceLine') },
      { text: activeSummary(now), bold: true },
      { text: t('vipShop.replaceCost', { price }) },
    ];
  }
  return [
    { text: t('vipShop.confirmTitle'), bold: true },
    { text: t('vipShop.confirmBuy', { tier: tierName(tier) }) },
    { text: t('vipShop.confirmPrice', { price }) },
  ];
}

const Card = observer(({ tier, now, onBuy }: { tier: number; now: number; onBuy: (tier: number) => void }) => {
  const remaining = Vip.remainingAt(tier, now);
  const active = remaining > 0;
  const locked = !Vip.isBuyable(tier, now);
  const bundle = tier === ALL_INCLUSIVE;
  const hint = refusalText(tier, now);
  const badge = active
    ? remainingText(remaining)
    : locked
      ? t('vipShop.included')
      : bundle && Vip.bundleSavings > 0
        ? t('vipShop.save', { amount: amount(Vip.bundleSavings) })
        : '';
  const progress = Math.min(1, remaining / (DURATION_DAYS * 86400));
  return (
    <div className={`vip-card${active ? ' active' : ''}${locked ? ' locked' : ''}${bundle ? ' bundle' : ''}`}>
      <div className="vip-card-head">
        <span className="vip-card-name">{tierName(tier)}</span>
        <span className="vip-card-badge">{badge}</span>
      </div>
      <div className="vip-card-line">{tierDesc(tier, 1)}</div>
      <div className="vip-card-line">{tierDesc(tier, 2)}</div>
      <div className="vip-card-foot">
        <div className="vip-card-cost">
          <div className="vip-card-price">
            {Vip.priceKnown(tier) ? t('vipShop.price', { price: amount(Vip.prices[tier]) }) : t('vipShop.loadingPrices')}
          </div>
          {hint && <div className="vip-card-reason">{hint}</div>}
        </div>
        <AccountButton
          label={t(active ? 'vipShop.extend' : 'vipShop.buy')}
          disabled={!!hint || Vip.buyPending}
          onClick={() => onBuy(tier)}
        />
      </div>
      {active && (
        <div className="acct-bar">
          <div style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  );
});

/** `CVipShopWindow` (UI/Vip/VipShopWindow.cpp, reforge_vip_shop.rml): the W Coin balance, the running tiers and one card per tier. */
export const VipShopWindow = observer(() => {
  const open = MuWindows.isOpen(VIP_WINDOW);
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState<number | null>(null);
  const [refusal, setRefusal] = useState<{ text: string; at: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirm(null);
    setRefusal(null);
    Vip.requestStatus();
    const status = setInterval(() => Vip.requestStatus(), STATUS_INTERVAL_MS);
    // The remaining times count down between two status answers.
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(status);
      clearInterval(tick);
    };
  }, [open]);

  const answer = Vip.answer && now - Vip.answer.at < MESSAGE_MS ? Vip.answer : null;
  const shownRefusal = refusal && now - refusal.at < MESSAGE_MS ? refusal : null;
  const message = shownRefusal
    ? { text: shownRefusal.text, good: false }
    : answer
      ? { text: t(BUY_ANSWER[answer.result] ?? 'vipShop.failed'), good: answer.result === VipBuyResult.Success }
      : null;

  const onBuy = (tier: number) => {
    const reason = refusalText(tier, Date.now());
    if (reason) {
      setRefusal({ text: reason, at: Date.now() });
      return;
    }
    setConfirm(tier);
  };

  return (
    <ModuleWindowFrame id={VIP_WINDOW} title={t('vipShop.title')} hotKey={HOT_KEY}>
      <AccountBody className="vip-body">
        <div className="vip-status">
          <span>
            {t('vipShop.wcoin')}: <b>{amount(Vip.wcoin)}</b>
          </span>
          <span>
            {t('vipShop.active')}: <b>{activeSummary(now)}</b>
          </span>
        </div>
        <div className="acct-hint">{t('vipShop.durationHint')}</div>
        {Array.from({ length: TIER_COUNT }, (_, tier) => (
          <Card key={tier} tier={tier} now={now} onBuy={tier => {
            onBuy(tier);
            setNow(Date.now());
          }} />
        ))}
        <div className={`acct-message${message?.good ? ' good' : ''}`}>{message?.text ?? ''}</div>
      </AccountBody>
      {confirm !== null && (
        <AccountConfirm
          lines={confirmLines(confirm, now)}
          buttons={[
            {
              label: t('vipShop.ok'),
              onClick: () => {
                Vip.buy(confirm);
                setConfirm(null);
              },
            },
            { label: t('vipShop.cancel'), onClick: () => setConfirm(null) },
          ]}
        />
      )}
    </ModuleWindowFrame>
  );
});
