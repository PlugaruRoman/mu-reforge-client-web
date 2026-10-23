import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { ModuleWindowFrame } from '@/controllers/interface/components/module_window';
import { Hero } from '@/modules/hero';
import { BaseClass, getBaseClass } from '@/modules/hero/characterStats';
import {
  ADD_STATS_WINDOW,
  MAX_INTERVAL,
  Resets,
  clampAuto,
  nextTriggerLevel,
  percentTotal,
  planBulk,
  pointsPerTrigger,
  type AutoStatSettings,
} from '@/modules/resets';
import { AccountBody, AccountButton, AccountRow, amount } from '../_shared/accountWidgets';
import './style.less';

const STAT_KEYS: readonly TextKey[] = ['addStats.str', 'addStats.agi', 'addStats.vit', 'addStats.ene', 'addStats.cmd'];
/** Digits only, at most `max` long (the window's maxlength and digits-only filter). */
const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);
const num = (value: string) => Number(value) || 0;

/** Command only for the Dark Lord (AddStatsWindow.cpp `showCommand`). */
const statCount = () => (getBaseClass(Hero.charClass) === BaseClass.DarkLord ? 5 : 4);

const Check = observer(({ checked, label, onClick, disabled }: { checked: boolean; label?: string; onClick: () => void; disabled?: boolean }) => (
  <span
    className={`acct-check${checked ? ' checked' : ''}`}
    data-no-drag="true"
    style={disabled ? { opacity: 0.5 } : undefined}
    onClick={() => !disabled && onClick()}
  >
    <span className="acct-box" />
    {label}
  </span>
));

/** The bulk tab: an amount per stat, or "Full" for whatever the other rows leave, spent at once. */
const BulkTab = observer(() => {
  const [typed, setTyped] = useState<string[]>(['', '', '', '', '']);
  const [full, setFull] = useState(-1);
  const count = statCount();
  const available = Hero.points;
  const plan = planBulk(typed.map(num), full, count, available);
  const status =
    plan.status === 'noPoints'
      ? t('addStats.noPoints')
      : plan.status === 'empty'
        ? t('addStats.typeAmount')
        : plan.status === 'tooMany'
          ? t('addStats.tooMany', { total: plan.total, available })
          : t('addStats.spending', { total: plan.total, available });

  const add = () => {
    plan.amounts.forEach((n, stat) => Resets.addPoints(stat, n));
    setTyped(['', '', '', '', '']);
    setFull(-1);
  };

  return (
    <>
      <AccountRow label={t('addStats.available')} value={amount(available)} />
      <div className="acct-heading">{t('addStats.distribute')}</div>
      {STAT_KEYS.slice(0, count).map((key, stat) => (
        <div key={key} className="add-stats-row">
          <span className="acct-label">{t(key)}</span>
          <input
            className="acct-field"
            data-no-drag="true"
            inputMode="numeric"
            disabled={full === stat}
            value={full === stat ? String(plan.amounts[stat]) : typed[stat]}
            onChange={e => setTyped(was => was.map((v, i) => (i === stat ? digits(e.target.value, 5) : v)))}
          />
          <Check checked={full === stat} label={t('addStats.full')} onClick={() => setFull(full === stat ? -1 : stat)} />
        </div>
      ))}
      <div className={`acct-message${plan.status === 'ready' ? ' good' : ''}`}>{status}</div>
      <div className="acct-buttons">
        <AccountButton label={t('addStats.clear')} onClick={() => (setTyped(['', '', '', '', '']), setFull(-1))} />
        <AccountButton label={t('addStats.add')} disabled={plan.status !== 'ready'} onClick={add} />
      </div>
    </>
  );
});

const same = (a: AutoStatSettings, b: AutoStatSettings, count: number) =>
  a.enabled === b.enabled && a.interval === b.interval && a.percents.slice(0, count).every((p, i) => p === b.percents[i]);

/** The Auto Add tab: the shares the server spends the points of every N levels by (D9 07 / 08). */
const AutoTab = observer(() => {
  const stored = Resets.auto;
  const [draft, setDraft] = useState<{ enabled: boolean; interval: string; percents: string[] } | null>(null);
  // The server's settings replace the fields whenever they arrive (open, and the echo of a save).
  useEffect(() => {
    if (stored) setDraft({ enabled: stored.enabled, interval: String(stored.interval), percents: stored.percents.map(String) });
  }, [stored]);

  const count = statCount();
  if (!stored || !draft) return <div className="acct-hint">{t('addStats.asking')}</div>;

  const settings = clampAuto({ enabled: draft.enabled, interval: num(draft.interval), percents: draft.percents.map(num) });
  const total = percentTotal(settings, count);
  const dirty = !same(settings, stored, count);
  const canSave = total <= 100 && dirty;
  const status = dirty
    ? t('addStats.unsaved')
    : stored.enabled
      ? t('addStats.savedNext', { level: nextTriggerLevel(Hero.level, stored.interval) })
      : t('addStats.savedOff');

  return (
    <>
      <Check checked={draft.enabled} label={t('addStats.enable')} onClick={() => setDraft({ ...draft, enabled: !draft.enabled })} />
      <div className="add-stats-row">
        <span className="acct-label">{t('addStats.every')}</span>
        <input
          className="acct-field"
          data-no-drag="true"
          inputMode="numeric"
          value={draft.interval}
          onChange={e => setDraft({ ...draft, interval: digits(e.target.value, String(MAX_INTERVAL).length) })}
        />
        <span className="acct-label">{t('addStats.levels')}</span>
      </div>
      <div className="acct-heading">{t('addStats.split')}</div>
      {STAT_KEYS.slice(0, count).map((key, stat) => (
        <div key={key} className="add-stats-row">
          <span className="acct-label">{t(key)}</span>
          <input
            className="acct-field"
            data-no-drag="true"
            inputMode="numeric"
            value={draft.percents[stat]}
            onChange={e => setDraft({ ...draft, percents: draft.percents.map((v, i) => (i === stat ? digits(e.target.value, 3) : v)) })}
          />
          <span className="add-stats-preview">
            {t('addStats.preview', { points: pointsPerTrigger(Resets.pointsPerLevelUp, settings.interval, settings.percents[stat]) })}
          </span>
        </div>
      ))}
      <div className={`acct-message${total > 100 ? '' : ' good'}`}>
        {total > 100 ? t('addStats.totalOver', { total }) : t('addStats.total', { total })}
      </div>
      <div className={`acct-message${dirty ? '' : ' good'}`}>{status}</div>
      <div className="acct-buttons">
        <AccountButton label={t('addStats.save')} disabled={!canSave} onClick={() => Resets.saveAuto(settings)} />
      </div>
    </>
  );
});

/** `CAddStatsWindow` (UI/Character/AddStatsWindow.cpp, reforge_add_stats.rml): two tabs, the bulk add and Auto Add. */
export const AddStatsWindow = observer(() => {
  const open = MuWindows.isOpen(ADD_STATS_WINDOW);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (open) Resets.requestAuto();
  }, [open]);

  return (
    <ModuleWindowFrame id={ADD_STATS_WINDOW} title={t('addStats.title')}>
      <AccountBody className="add-stats-body">
        <div className="acct-buttons">
          <AccountButton label={t('addStats.tabAdd')} active={tab === 0} onClick={() => setTab(0)} />
          <AccountButton label={t('addStats.tabAuto')} active={tab === 1} onClick={() => setTab(1)} />
        </div>
        {tab === 0 ? <BulkTab /> : <AutoTab />}
      </AccountBody>
    </ModuleWindowFrame>
  );
});
