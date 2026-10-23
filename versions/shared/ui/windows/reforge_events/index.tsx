import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { t, type TextKey } from '@/i18n';
import { Ecs } from '@/ecs/current';
import { MuWindows } from '@/controllers/interface';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { playUiSound } from '@/controllers/sound/sfx';
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

/**
 * Our server's event HUDs: the Doppelganger frame (`CDoppelGangerFrame`, UI/Events/DoppelGangerFrame.cpp),
 * the Imperial Guardian timer (`CEmpireGuardianTimer`), the Fort Siege capture line (`CFortSiegeHud`)
 * and the Fortress Herald window (`CFortSiegeWindow`, NPC 767), with the boxes their packets raise.
 */

const ORANGE = 'rgb(255, 150, 0)';
const GOOD = 'rgb(120, 230, 120)';
const BAD = 'rgb(255, 90, 70)';
const MUTED = 'rgb(150, 150, 150)';

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

const Row = observer(({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="re-row">
    <MuText text={label} color={TEXT_COLOR.orange} />
    <MuText text={value} color={color ?? TEXT_COLOR.brightGray} />
  </div>
));

const Button = observer(({ label, enabled = true, onClick }: { label: string; enabled?: boolean; onClick: () => void }) => (
  <div
    className={`re-button${enabled ? '' : ' disabled'}`}
    onClick={() => {
      if (!enabled) return;
      playUiSound('click');
      onClick();
    }}
  >
    {label}
  </div>
));

const StatusTab = observer(function StatusTab({ s, now }: { s: RegistrationState; now: number }) {
  const left = (seconds: number) => Math.max(0, seconds - Math.floor((now - FortSiege.registrationAt) / 1000));
  const phase =
    s.phase === Phase.RegistrationOpen
      ? [
          <MuText key="p" className="re-line" text={t('reforgeEvents.fort.registrationOpen')} color={GOOD} />,
          <Row key="c" label={t('reforgeEvents.fort.closesIn')} value={clock(left(s.secondsUntilClose))} />,
          <Row key="b" label={t('reforgeEvents.fort.battleIn')} value={clock(left(s.secondsUntilBattle))} />,
        ]
      : s.phase === Phase.RegistrationClosed
        ? [
            <MuText key="p" className="re-line" text={t('reforgeEvents.fort.registrationClosed')} color={ORANGE} />,
            <Row key="b" label={t('reforgeEvents.fort.battleIn')} value={clock(left(s.secondsUntilBattle))} />,
          ]
        : [
            <MuText key="p" className="re-line" text={t('reforgeEvents.fort.battleRunning')} color={BAD} />,
            <Row key="b" label={t('reforgeEvents.fort.timeLeft')} value={clock(left(s.secondsUntilBattle))} />,
          ];
  let guild: JSX.Element[];
  if (s.role === Role.NoGuild) guild = [<MuText key="n" className="re-line" text={t('reforgeEvents.fort.noGuild')} color={MUTED} />];
  else if (s.ownedFort >= 0)
    guild = [
      <Row key="o" label={t('reforgeEvents.fort.owns')} value={fortName(s.ownedFort)} color={GOOD} />,
      <MuText key="d" className="re-line" text={t('reforgeEvents.fort.defendsIt')} color={MUTED} />,
    ];
  else if (s.registeredFort >= 0)
    guild = [
      <Row key="a" label={t('reforgeEvents.fort.attacks')} value={fortName(s.registeredFort)} />,
      <Row key="s" label={t('reforgeEvents.fort.signs')} value={t('reforgeEvents.fort.signsRank', { signs: s.signs, rank: ownRank(s) })} />,
      <MuText
        key="w"
        className="re-line"
        text={t(wouldAttack(s) ? 'reforgeEvents.fort.inTheTop' : 'reforgeEvents.fort.notInTop')}
        color={wouldAttack(s) ? GOOD : ORANGE}
      />,
    ];
  else guild = [<MuText key="r" className="re-line" text={t('reforgeEvents.fort.notRegistered')} color={MUTED} />];
  return (
    <>
      {phase}
      <div className="re-panel">
        <MuText face="bold" className="re-line" text={t('reforgeEvents.fort.owners')} color={TEXT_COLOR.brightYellow} />
        {s.forts.map((f, i) => (
          <Row
            key={i}
            label={fortName(i)}
            value={f.enabled ? f.owner || t('reforgeEvents.fort.nobody') : t('reforgeEvents.fort.closed')}
            color={f.enabled ? undefined : MUTED}
          />
        ))}
      </div>
      <div className="re-panel">
        <MuText face="bold" className="re-line" text={t('reforgeEvents.fort.yourGuild')} color={TEXT_COLOR.brightYellow} />
        {guild}
      </div>
    </>
  );
});

const RegisterTab = observer(function RegisterTab({ s }: { s: RegistrationState }) {
  if (s.role === Role.NoGuild) return <MuText className="re-line" text={t('reforgeEvents.fort.joinGuild')} color={MUTED} />;
  if (s.ownedFort >= 0)
    return <MuText className="re-line" text={t('reforgeEvents.fort.yourGuildOwns', { fort: fortName(s.ownedFort) })} color={GOOD} />;
  if (s.registeredFort < 0)
    return (
      <>
        <MuText
          className="re-line"
          text={t(s.phase === Phase.RegistrationOpen ? 'reforgeEvents.fort.chooseFort' : 'reforgeEvents.fort.registrationIsClosed')}
        />
        {Array.from({ length: Math.min(FORT_COUNT, s.forts.length) }, (_, i) => (
          <Button
            key={i}
            label={`${fortName(i)} (${t('reforgeEvents.fort.guildsRegistered', { count: s.forts[i].guildCount })})`}
            enabled={canRegister(s, i)}
            onClick={() => FortSiege.register(i)}
          />
        ))}
        {s.role !== Role.Master && <MuText className="re-line" text={t('reforgeEvents.fort.onlyMasters')} color={MUTED} />}
      </>
    );
  return (
    <>
      <Row label={t('reforgeEvents.fort.attacks')} value={fortName(s.registeredFort)} />
      <Row label={t('reforgeEvents.fort.signsHandedIn')} value={String(s.signs)} />
      <Row label={t('reforgeEvents.fort.rank')} value={`${ownRank(s)} / ${s.forts[s.registeredFort]?.guildCount ?? 0}`} />
      <Row label={t('reforgeEvents.fort.attackers')} value={t('reforgeEvents.fort.topN', { n: s.maximumAttackers })} />
      <Row label={t('reforgeEvents.fort.signsInBag')} value={String(s.signsInBag)} />
      <Button
        label={s.signsInBag > 0 ? t('reforgeEvents.fort.handIn', { n: s.signsInBag }) : t('reforgeEvents.fort.noSignInBag')}
        enabled={canHandInSigns(s)}
        onClick={() => FortSiege.handInSigns()}
      />
      {s.role === Role.Master && (
        <>
          <Button label={t('reforgeEvents.fort.withdraw')} enabled={canWithdraw(s)} onClick={() => FortSiege.withdraw()} />
          <MuText className="re-line" text={t('reforgeEvents.fort.withdrawnLost')} color={MUTED} />
        </>
      )}
    </>
  );
});

const GuildsTab = observer(function GuildsTab({ s }: { s: RegistrationState }) {
  return (
    <>
      {s.forts.map((f, i) => (
        <div key={i} className="re-panel">
          <MuText face="bold" className="re-line" text={fortName(i)} color={TEXT_COLOR.brightYellow} />
          <Row label={t('reforgeEvents.fort.defender')} value={f.owner || t('reforgeEvents.fort.noOwner')} />
          {f.guilds.length === 0 && <MuText className="re-line" text={t('reforgeEvents.fort.noGuildRegistered')} color={MUTED} />}
          {f.guilds.map((g, place) => (
            <Row key={place} label={g.name} value={String(g.signs)} color={listedGuildAttacks(s, place, g.signs) ? GOOD : undefined} />
          ))}
          {f.guildCount > f.guilds.length && (
            <MuText className="re-line" text={t('reforgeEvents.fort.more', { n: f.guildCount - f.guilds.length })} color={MUTED} />
          )}
        </div>
      ))}
      <MuText className="re-line" text={t('reforgeEvents.fort.legend', { n: s.maximumAttackers, signs: s.minimumSigns })} color={MUTED} />
    </>
  );
});

const HeraldWindow = observer(() => {
  const now = useTick(1000);
  const [tab, setTab] = useState<Tab>('status');
  const close = () => MuWindows.setOpen(HERALD_WINDOW, false);
  const s = FortSiege.registration;
  return (
    <MuItemWindow id="fort-herald-window" label={t('reforgeEvents.fort.heraldTitle')} onClose={close}>
      <MuText face="bold" align="center" className="re-title" text={t('reforgeEvents.fort.heraldTitle')} />
      <div className="re-tabs" data-no-drag="true">
        {(['status', 'register', 'guilds'] as const).map(id => (
          <div key={id} className={`re-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {t(`reforgeEvents.fort.tab.${id}` as TextKey)}
          </div>
        ))}
      </div>
      <div className="re-body" data-no-drag="true">
        {FortSiege.awaiting || !s ? (
          <MuText className="re-line" text={t('reforgeEvents.fort.talking')} />
        ) : tab === 'status' ? (
          <StatusTab s={s} now={now} />
        ) : tab === 'register' ? (
          <RegisterTab s={s} />
        ) : (
          <GuildsTab s={s} />
        )}
      </div>
    </MuItemWindow>
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
