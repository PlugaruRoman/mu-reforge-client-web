import './style.less';
import { useEffect, useState, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { t, type TextKey } from '@/i18n';
import { Ecs } from '@/ecs/current';
import { MuWindows } from '@/controllers/interface';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { Doppelganger } from '@/modules/doppelganger';
import { ImperialGuardian, PHASE_BATTLE, type GuardianBox } from '@/modules/imperial_guardian';
import {
  FORT_COUNT,
  FortSiege,
  HERALD_WINDOW,
  Phase,
  Role,
  canHandInSigns,
  canRegister,
  canWithdraw,
  listedGuildAttacks,
  ownRank,
  wouldAttack,
  type RegistrationState,
} from '@/modules/fort_siege';
import { NoticeBox, useStage } from './noticeBox';
import { guildMarkDataUrl, packGuildMark } from '@/core/guildMark';
import { ReforgeShell, RfButton, RfTableHead, RfTabs } from '../_shared/reforgeShell';

/**
 * Our server's event HUDs: the Doppelganger frame (`CDoppelGangerFrame`, UI/Events/DoppelGangerFrame.cpp),
 * the Imperial Guardian timer (`CEmpireGuardianTimer`), the Fort Siege capture line (`CFortSiegeHud`)
 * and the Fortress Herald window (`CFortSiegeWindow`, NPC 767), with the boxes their packets raise.
 */

const ORANGE = 'rgb(255, 150, 0)';

/** Re-renders every `ms` while mounted. */
function useTick(ms: number): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const two = (n: number) => String(n).padStart(2, '0');

// ---- Doppelganger ------------------------------------------------------------

/** The workspace slot of the frame (themes/legacy/workspace.rcss) and its art (doppelganger_frame.rcss). */
const DG = { x: 413, y: 342, width: 227, height: 87, textX: 117, textWidth: 110, barX: 59, barWidth: 167 } as const;
const DG_PASSED_COLOR = [ORANGE, 'rgb(255, 70, 0)', 'rgb(255, 0, 0)'];

/** A gauge piece: the right-aligned `fill` of the bar over 167 units from x 59 (`BarPiece`). */
const Bar = observer(({ file, fill }: { file: string; fill: number }) => (
  <MuSpriteFrame
    file={file}
    x={165 * (1 - fill)}
    width={DG.barWidth * fill}
    height={7}
    style={{ position: 'absolute', left: DG.barX + DG.barWidth * (1 - fill), top: 78 }}
  />
));

const DoppelgangerFrame = observer(() => {
  const at = useStage();
  const now = useTick(100);
  const d = Doppelganger;
  // The original's per-frame approach of the gauges to the received positions.
  useEffect(() => {
    if (!d.frameOpen) return;
    let last = performance.now();
    let frame = 0;
    const step = () => {
      const time = performance.now();
      runInAction(() => d.update((time - last) / 1000));
      last = time;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [d, d.frameOpen]);

  const notice =
    d.notice && now - d.noticeAt < 30000 ? t(`reforgeEvents.dg.notice.${d.notice}` as TextKey, { seconds: Math.max(0, 30 - Math.floor((now - d.noticeAt) / 1000)) }) : null;
  if (!d.frameOpen) return notice ? <div className="re-countdown" style={at(320, 400)}>{notice}</div> : null;

  const left = d.secondsLeft(now);
  // `%.2d:%.2d:%.2d`: minutes, seconds and the running hundredths of the original.
  const hundredths = d.timerStopped ? 0 : 99 - (Math.floor(now / 10) % 100);
  const passed = Math.min(d.enteredMonsters, 2);
  const hero = Ecs.world?.playerEntity?.netId;
  const bars =
    d.enteredMonsters === 0
      ? [['Double_bar(Y).OZJ', d.monsterGauge]]
      : d.enteredMonsters === 1
        ? [['Double_bar(Y).OZJ', 1], ['Double_bar(O).OZJ', d.monsterGauge]]
        : [['Double_bar(O).OZJ', 1], ['Double_bar(R).OZJ', d.monsterGauge]];

  return (
    <>
      {notice && <div className="re-countdown" style={at(320, 320)}>{notice}</div>}
      <div className="re-dg" style={{ ...at(DG.x, DG.y), width: DG.width, height: DG.height }}>
        <MuSpriteFrame file="Double_back.OZT" width={DG.width} height={DG.height} style={{ position: 'absolute', left: 0, top: 0 }} />
        <div className="re-dg-text" style={{ left: DG.textX, top: 13, width: DG.textWidth, color: DG_PASSED_COLOR[passed] }}>
          {t('reforgeEvents.dg.passed', { entered: d.enteredMonsters, max: d.maxMonsters })}
        </div>
        <div className="re-dg-text" style={{ left: DG.textX, top: 38, width: DG.textWidth, color: ORANGE }}>
          {t('reforgeEvents.timeLeft')}
        </div>
        <div className="re-dg-text big" style={{ left: DG.textX, top: 50, width: DG.textWidth, color: ORANGE }}>
          {`${two(Math.floor(left / 60))}:${two(left % 60)}:${two(hundredths)}`}
        </div>
        {bars.map(([file, fill], i) => (
          <Bar key={i} file={file as string} fill={fill as number} />
        ))}
        {d.iceWalker && (
          <MuSpriteFrame
            file="Double_Micon01.OZT"
            width={13}
            height={7}
            style={{ position: 'absolute', left: DG.barX - 6.5 + DG.barWidth * d.iceWalkerPosition, top: 77 }}
          />
        )}
        {[...d.party.entries()].map(([id, p]) => (
          <MuSpriteFrame
            key={id}
            file={id === hero ? 'Double_Baricon04.OZT' : 'Double_Baricon01.OZT'}
            width={9}
            height={8}
            style={{ position: 'absolute', left: DG.barX - 4.5 + DG.barWidth * p.drawn, top: 79 }}
          />
        ))}
      </div>
    </>
  );
});

const DG_BOX: Record<string, TextKey[]> = {
  rules: ['reforgeEvents.dg.rules1', '', 'reforgeEvents.dg.rules2', '', 'reforgeEvents.dg.rules3'] as TextKey[],
  success: ['reforgeEvents.dg.congratulations', '', 'reforgeEvents.dg.success'] as TextKey[],
  failed: ['reforgeEvents.dg.failed'],
  escaped: ['reforgeEvents.dg.escaped1', '', 'reforgeEvents.dg.escaped2'] as TextKey[],
};

const DoppelgangerBox = observer(() => {
  const box = Doppelganger.box;
  if (!box) return null;
  const lines = DG_BOX[box].map(k => (k ? t(k) : ''));
  return <NoticeBox lines={lines} onOk={() => runInAction(() => Doppelganger.closeBox())} />;
});

// ---- Imperial Guardian -------------------------------------------------------

/** The workspace slot of the timer (themes/legacy/workspace.rcss). */
const IG = { x: 507, y: 342, width: 124, height: 64 } as const;

const GuardianTimer = observer(() => {
  const at = useStage();
  const now = useTick(250);
  const g = ImperialGuardian;
  if (!g.open) return null;
  const seconds = Math.floor(g.msLeft(now) / 1000);
  const minutes = Math.floor(seconds / 60);
  const battle = g.phase === PHASE_BATTLE;
  // Orange, red-orange under three minutes, red under one.
  const timeColor = minutes > 2 ? ORANGE : minutes > 0 ? 'rgb(255, 70, 0)' : 'rgb(255, 0, 0)';
  return (
    <div className="re-panel re-ig" style={{ ...at(IG.x, IG.y), width: IG.width, height: IG.height }}>
      <MuText className="re-line" text={t('reforgeEvents.ig.roundZone', { round: g.round, zone: g.zone })} color={TEXT_COLOR.white} />
      <MuText
        className="re-line"
        text={battle ? `${t('reforgeEvents.timeLeft')} (${t('reforgeEvents.ig.monstersLeft')})` : t('reforgeEvents.ig.standby')}
        color={ORANGE}
      />
      <MuText face="bold" className="re-line big" text={`${two(minutes)}:${two(seconds % 60)}(${g.monsterCount})`} color={timeColor} />
    </div>
  );
});

function guardianLines(box: GuardianBox): string[] {
  switch (box.kind) {
    case 'entryDelay':
      return [t('reforgeEvents.ig.entryTime'), '', t('reforgeEvents.ig.enterAfter', { minutes: box.minutes })];
    case 'missingQuestItem':
      return [t('reforgeEvents.ig.missingQuestItem')];
    case 'full':
      return [t('reforgeEvents.ig.full')];
    case 'zoneCooldown':
      return [t('reforgeEvents.ig.zoneCooldown')];
    case 'partyRequired':
      return [t('reforgeEvents.ig.partyRequired')];
    case 'failed':
      return [t('reforgeEvents.ig.failed1'), t('reforgeEvents.ig.fortress')];
    case 'zoneCleared':
      return [t('reforgeEvents.ig.round', { round: box.round }), t('reforgeEvents.ig.zoneCleared', { zone: box.zone })];
    case 'roundCleared':
      return [
        t('reforgeEvents.ig.round', { round: box.round }),
        t('reforgeEvents.ig.cleared'),
        t('reforgeEvents.ig.rewardExp', { exp: box.experience }),
      ];
  }
}

const GuardianBoxView = observer(() => {
  const box = ImperialGuardian.box;
  if (!box) return null;
  return <NoticeBox lines={guardianLines(box)} onOk={() => runInAction(() => ImperialGuardian.closeBox())} />;
});

// ---- Fort Siege --------------------------------------------------------------

/** "Crystal: <guild> / <player> - N s" at the bottom centre (`CFortSiegeHud`). */
const CaptureLine = observer(() => {
  const at = useStage();
  const now = useTick(250);
  const map = Ecs.world?.mapIndex ?? -1;
  const c = FortSiege.capture;
  if (!c || !FortSiege.captureShown(now, map)) return null;
  return (
    <div className="re-capture" style={at(320, 380)}>
      {t('reforgeEvents.fort.captureLine', { guild: c.guild, player: c.player, seconds: FortSiege.captureSeconds(now) })}
    </div>
  );
});

const FORT_KEYS: readonly TextKey[] = ['reforgeEvents.fort.noria', 'reforgeEvents.fort.lorencia', 'reforgeEvents.fort.devias'];
const fortName = (i: number) => (FORT_KEYS[i] ? t(FORT_KEYS[i]) : '?');

/** `FortSiegeDurationHours` / `Minutes`. */
function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${two(m)}m` : `${m}m ${two(seconds % 60)}s`;
}

type Tab = 'status' | 'register' | 'guilds';
const TABS: readonly Tab[] = ['status', 'register', 'guilds'];

/** reforge_fort_siege.rcss `tone-N`. */
const TONE = { normal: '#e6e2c8', good: '#78e678', warn: '#ffaa46', gold: '#ffd25a', muted: '#8c8c96', bad: '#ff5a46' } as const;
type Tone = keyof typeof TONE;

const Mark = observer(({ cells }: { cells: number[] | null }) =>
  cells ? <img className="fs-mark" alt="" src={guildMarkDataUrl(packGuildMark(cells))} /> : null
);

const Row = observer(({ label, value, tone, mark }: { label: string; value: string; tone?: Tone; mark?: number[] | null }) => (
  <div className="fs-row">
    <span className="fs-label">{label}</span>
    <span className="fs-value" style={{ color: TONE[tone ?? 'normal'] }}>
      {mark !== undefined && <Mark cells={mark} />}
      {value}
    </span>
  </div>
));

const Line = observer(({ text, tone }: { text: string; tone?: Tone }) => (
  <div className="fs-line" style={tone ? { color: TONE[tone] } : undefined}>
    {text}
  </div>
));

const Panel = observer(({ title, children, className }: { title?: string; children?: ReactNode; className?: string }) => (
  <div className={`fs-panel${className ? ` ${className}` : ''}`}>
    {title && <div className="fs-panel-title">{title}</div>}
    {children}
  </div>
));

const StatusTab = observer(function StatusTab({ s, now }: { s: RegistrationState; now: number }) {
  const left = (seconds: number) => Math.max(0, seconds - Math.floor((now - FortSiege.registrationAt) / 1000));
  const phase =
    s.phase === Phase.RegistrationOpen ? (
      <>
        <div className="fs-phase-title">{t('reforgeEvents.fort.registrationOpen')}</div>
        <Row label={t('reforgeEvents.fort.closesIn')} value={clock(left(s.secondsUntilClose))} />
        <Row label={t('reforgeEvents.fort.battleIn')} value={clock(left(s.secondsUntilBattle))} />
      </>
    ) : s.phase === Phase.RegistrationClosed ? (
      <>
        <div className="fs-phase-title">{t('reforgeEvents.fort.registrationClosed')}</div>
        <Row label={t('reforgeEvents.fort.battleIn')} value={clock(left(s.secondsUntilBattle))} />
      </>
    ) : (
      <>
        <div className="fs-phase-title">{t('reforgeEvents.fort.battleRunning')}</div>
        <Row label={t('reforgeEvents.fort.timeLeft')} value={clock(left(s.secondsUntilBattle))} />
      </>
    );
  let guild: ReactNode;
  if (s.role === Role.NoGuild) guild = <Line text={t('reforgeEvents.fort.noGuild')} tone="muted" />;
  else if (s.ownedFort >= 0)
    guild = (
      <>
        <Row label={t('reforgeEvents.fort.owns')} value={fortName(s.ownedFort)} tone="good" />
        <Line text={t('reforgeEvents.fort.defendsIt')} tone="muted" />
      </>
    );
  else if (s.registeredFort >= 0)
    guild = (
      <>
        <Row label={t('reforgeEvents.fort.attacks')} value={fortName(s.registeredFort)} />
        <Row label={t('reforgeEvents.fort.signs')} value={t('reforgeEvents.fort.signsRank', { signs: s.signs, rank: ownRank(s) })} />
        <Line text={t(wouldAttack(s) ? 'reforgeEvents.fort.inTheTop' : 'reforgeEvents.fort.notInTop')} tone={wouldAttack(s) ? 'good' : 'warn'} />
      </>
    );
  else guild = <Line text={t('reforgeEvents.fort.notRegistered')} tone="muted" />;
  return (
    <>
      <Panel className={`fs-phase phase-${s.phase}`}>{phase}</Panel>
      <Panel title={t('reforgeEvents.fort.owners')}>
        {s.forts.map((f, i) => (
          <Row
            key={i}
            label={fortName(i)}
            value={f.enabled ? f.owner || t('reforgeEvents.fort.nobody') : t('reforgeEvents.fort.closed')}
            tone={f.enabled ? (f.owner ? 'gold' : 'muted') : 'muted'}
            mark={f.enabled ? f.ownerEmblem : null}
          />
        ))}
      </Panel>
      <Panel title={t('reforgeEvents.fort.yourGuild')}>{guild}</Panel>
    </>
  );
});

const RegisterTab = observer(function RegisterTab({ s }: { s: RegistrationState }) {
  if (s.role === Role.NoGuild) return <Line text={t('reforgeEvents.fort.joinGuild')} tone="muted" />;
  if (s.ownedFort >= 0) return <Line text={t('reforgeEvents.fort.yourGuildOwns', { fort: fortName(s.ownedFort) })} tone="good" />;
  if (s.registeredFort < 0)
    return (
      <>
        <div className="fs-line fs-headline">
          {t(s.phase === Phase.RegistrationOpen ? 'reforgeEvents.fort.chooseFort' : 'reforgeEvents.fort.registrationIsClosed')}
        </div>
        {Array.from({ length: Math.min(FORT_COUNT, s.forts.length) }, (_, i) => {
          const f = s.forts[i];
          return (
            <Panel key={i} className="fs-card">
              <div className="fs-card-text">
                <div className="fs-card-name">{fortName(i)}</div>
                <div className={`fs-card-owner${f.owner ? '' : ' none'}`}>
                  <Mark cells={f.ownerEmblem} />
                  {f.owner || t('reforgeEvents.fort.noOwner')}
                </div>
                <div className="fs-card-count">{t('reforgeEvents.fort.guildsRegistered', { count: f.guildCount })}</div>
              </div>
              <RfButton small label={t('reforgeEvents.fort.tab.register')} disabled={!canRegister(s, i)} onClick={() => FortSiege.register(i)} />
            </Panel>
          );
        })}
        {s.role !== Role.Master && <Line text={t('reforgeEvents.fort.onlyMasters')} tone="muted" />}
      </>
    );
  return (
    <div className="fs-registered">
      <Panel title={t('reforgeEvents.fort.attacks')}>
        <div className="fs-fort-name">{fortName(s.registeredFort)}</div>
        <Row label={t('reforgeEvents.fort.signsHandedIn')} value={String(s.signs)} tone="gold" />
        <Row label={t('reforgeEvents.fort.rank')} value={`${ownRank(s)} / ${s.forts[s.registeredFort]?.guildCount ?? 0}`} />
        <Row label={t('reforgeEvents.fort.attackers')} value={t('reforgeEvents.fort.topN', { n: s.maximumAttackers })} />
        <Row label={t('reforgeEvents.fort.signsInBag')} value={String(s.signsInBag)} />
      </Panel>
      <RfButton
        className="fs-wide-btn"
        width="100%"
        label={s.signsInBag > 0 ? t('reforgeEvents.fort.handIn', { n: s.signsInBag }) : t('reforgeEvents.fort.noSignInBag')}
        disabled={!canHandInSigns(s)}
        onClick={() => FortSiege.handInSigns()}
      />
      {s.role === Role.Master && (
        <>
          <RfButton className="fs-wide-btn" width="100%" label={t('reforgeEvents.fort.withdraw')} disabled={!canWithdraw(s)} onClick={() => FortSiege.withdraw()} />
          <div className="fs-hint">{t('reforgeEvents.fort.withdrawnLost')}</div>
        </>
      )}
    </div>
  );
});

const GuildsTab = observer(function GuildsTab({ s }: { s: RegistrationState }) {
  const [fort, setFort] = useState(0);
  const f = s.forts[Math.min(fort, s.forts.length - 1)];
  return (
    <>
      <RfTabs tabs={s.forts.map((_, i) => ({ id: i, label: fortName(i) }))} active={fort} onSelect={setFort} />
      {f && (
        <Panel className="fs-guilds">
          <Row label={t('reforgeEvents.fort.defender')} value={f.owner || t('reforgeEvents.fort.noOwner')} tone={f.owner ? 'gold' : 'muted'} mark={f.ownerEmblem} />
          <RfTableHead
            className="fs-columns"
            columns={[{ label: t('reforgeEvents.fort.attackers') }, { label: t('reforgeEvents.fort.signs'), width: 40, align: 'right' }]}
          />
          {f.guilds.length === 0 && <div className="fs-empty">{t('reforgeEvents.fort.noGuildRegistered')}</div>}
          {f.guilds.map((g, place) => (
            <div key={place} className={`rf-row fs-listed${listedGuildAttacks(s, place, g.signs) ? ' attacks' : ''}`}>
              <span className="fs-column-guild">
                <span className="fs-place">{place + 1}</span>
                <Mark cells={g.emblem} />
                {g.name}
              </span>
              <span className="fs-column-signs">{g.signs}</span>
            </div>
          ))}
          {f.guildCount > f.guilds.length && <div className="fs-more">{t('reforgeEvents.fort.more', { n: f.guildCount - f.guilds.length })}</div>}
        </Panel>
      )}
      <Line text={t('reforgeEvents.fort.legend', { n: s.maximumAttackers, signs: s.minimumSigns })} tone="muted" />
    </>
  );
});

/**
 * `CFortSiegeWindow` (reforge_fort_siege.rml), 230 x 430: tabs Status | Register | Guilds over framed
 * panels, Close.
 */
const HeraldWindow = observer(() => {
  const now = useTick(1000);
  const [tab, setTab] = useState<Tab>('status');
  const s = FortSiege.registration;
  return (
    <ReforgeShell id={HERALD_WINDOW} title={t('reforgeEvents.fort.heraldTitle')} height={430} className="fort-herald">
      <RfTabs tabs={TABS.map(id => ({ id, label: t(`reforgeEvents.fort.tab.${id}` as TextKey) }))} active={tab} onSelect={setTab} />
      <div className="fs-page">
        {FortSiege.awaiting || !s ? (
          <div className="fs-wait">{t('reforgeEvents.fort.talking')}</div>
        ) : tab === 'status' ? (
          <StatusTab s={s} now={now} />
        ) : tab === 'register' ? (
          <RegisterTab s={s} />
        ) : (
          <GuildsTab s={s} />
        )}
      </div>
    </ReforgeShell>
  );
});

/** Registered by `window.ts`, one definition per module. */
export const DoppelgangerHud = observer(() => (
  <>
    <DoppelgangerFrame />
    <DoppelgangerBox />
  </>
));

/** Adviser Jerinteu (`CEmpireGuardianNPC`): OK enters, Cancel closes. */
const GuardianEntry = observer(() =>
  ImperialGuardian.entryOpen ? (
    <NoticeBox
      lines={[
        t('reforgeEvents.ig.entryTitle'),
        t('reforgeEvents.ig.entryText1'),
        t('reforgeEvents.ig.entryText2'),
        '',
        t('reforgeEvents.ig.entryRound7'),
        t('reforgeEvents.ig.partyRequired'),
      ]}
      onOk={() => ImperialGuardian.enter()}
      onCancel={() => ImperialGuardian.closeEntry()}
    />
  ) : null
);

export const ImperialGuardianHud = observer(() => (
  <>
    <GuardianTimer />
    <GuardianBoxView />
    <GuardianEntry />
  </>
));

export const FortSiegeWindows = observer(() => (
  <>
    <CaptureLine />
    {MuWindows.isOpen(HERALD_WINDOW) && <HeraldWindow />}
  </>
));
