import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import { GameOptions } from '@/controllers/settings';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { useUiStageScale } from '@/controllers/interface/components/ui_stage';
import { togglesWindow } from '@/controllers/interface/components/module_window';
import { useEventBus } from '@/controllers/interface/hooks';
import { playUiSound } from '@/controllers/sound/sfx';
import { addNotification } from '@/modules/chat';
import { Social } from '@/modules/social/social';
import { BUFF_ICON_HEIGHT, BUFF_ICON_WIDTH, buffIconCell } from '@/modules/skills/recipes';
import {
  GUEST_ACCESS_WINDOW,
  GUEST_HOURS,
  GUEST_MAX_SESSIONS,
  GUEST_PERMISSIONS,
  ReforgeHud,
  type GuestSession,
} from '@/modules/reforge_hud';
import { cornerPanelSpan } from '../../hud/minimap/corner';

/**
 * Our client's small Mu Reforge pieces: the party members' buffs beside the party list
 * (UI/Party/PartyBuffRows.cpp, reforge_party_buffs.rml) and the Guest Access window
 * (UI/GuestAccess/GuestAccessWindow.cpp), which opens with its key (L in our client).
 */

// ---- party buffs -------------------------------------------------------------

/** The party list's plates (`hud/party_list`): 2 px in from the right, from y 14, one every 24 px, 77 wide. */
const LIST = { right: 2, top: 14, step: 24, width: 77 } as const;
/** Half-size icons, at most this many a member. */
const ICON = { scale: 0.5, max: 8 } as const;

const PartyBuffs = observer(() => {
  const scale = useUiStageScale();
  const members = Social.partyMembers;
  const buffs = ReforgeHud.partyBuffs;
  if (members.length === 0 || buffs.length === 0) return null;
  const right = (GameOptions.minimapCorner ? cornerPanelSpan() : 0) + (LIST.right + LIST.width + 2) * scale;
  const w = BUFF_ICON_WIDTH * ICON.scale;
  const h = BUFF_ICON_HEIGHT * ICON.scale;
  return (
    <div className="rh-party-buffs" style={{ right, top: LIST.top * scale, transform: `scale(${scale})` }}>
      {members.map((_, i) => (
        <div key={i} className="rh-party-buff-row" style={{ top: i * LIST.step + (LIST.step - h) / 2 - 1, height: h }}>
          {(buffs[i] ?? []).slice(0, ICON.max).map((id, j) => {
            const cell = buffIconCell(id);
            if (!cell) return null;
            return (
              <div key={j} className="rh-party-buff" style={{ width: w, height: h }}>
                <MuSpriteFrame
                  file={cell.file}
                  x={cell.x}
                  y={cell.y}
                  width={BUFF_ICON_WIDTH}
                  height={BUFF_ICON_HEIGHT}
                  style={{ transform: `scale(${ICON.scale})`, transformOrigin: 'left top' }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});

// ---- Guest Access ------------------------------------------------------------

const PERMISSION_KEYS: readonly TextKey[] = [
  'reforgeHud.guest.perm.chat',
  'reforgeHud.guest.perm.trade',
  'reforgeHud.guest.perm.sell',
  'reforgeHud.guest.perm.buy',
  'reforgeHud.guest.perm.craft',
  'reforgeHud.guest.perm.xshop',
  'reforgeHud.guest.perm.vault',
  'reforgeHud.guest.perm.jewelBank',
  'reforgeHud.guest.perm.guild',
  'reforgeHud.guest.perm.friends',
  'reforgeHud.guest.perm.useJewels',
];

/** The Guest Access key in our client (`ReforgeMenuEntries.cpp`); a key bound to a built-in action stays the action's. */
const GUEST_ACCESS_KEY = 'KeyL';

function timeLeft(seconds: number): string {
  if (seconds <= 0) return t('reforgeHud.guest.expired');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(seconds % 60).padStart(2, '0')}s`;
}

const copy = (text: string) => {
  void navigator.clipboard?.writeText(text).then(() => addNotification(t('reforgeHud.guest.copied')));
};

const GuestAccessWindow = observer(() => {
  const [tab, setTab] = useState<'settings' | 'sessions'>('settings');
  // No permission ticked: the owner grants what the guest may do.
  const [permissions, setPermissions] = useState(0);
  const [hours, setHours] = useState<number>(GUEST_HOURS.initial);
  const [name, setName] = useState('');
  const [now, setNow] = useState(() => performance.now());
  const [revoke, setRevoke] = useState<GuestSession | null>(null);
  useEffect(() => {
    ReforgeHud.requestGuestList();
    const id = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const close = () => MuWindows.setOpen(GUEST_ACCESS_WINDOW, false);
  const generated = ReforgeHud.generated;
  const sessions = ReforgeHud.guestSessions;
  const full = sessions.length >= GUEST_MAX_SESSIONS;
  const generate = () => {
    if (full) {
      addNotification(t('reforgeHud.guest.limitReached', { max: GUEST_MAX_SESSIONS }), 'error');
      return;
    }
    playUiSound('click');
    ReforgeHud.generateGuest(permissions, hours, name);
  };

  const password = !generated
    ? t('reforgeHud.guest.notGenerated')
    : generated.pending
      ? '...'
      : generated.success
        ? generated.password
        : t('reforgeHud.guest.refused');

  return (
    <MuItemWindow id="guest-access-window" label={t('reforgeHud.guest.title')} onClose={close}>
      <MuText face="bold" align="center" className="rh-title" text={t('reforgeHud.guest.title')} />
      <div className="rh-tabs" data-no-drag="true">
        {(['settings', 'sessions'] as const).map(id => (
          <div
            key={id}
            className={`rh-tab${tab === id ? ' active' : ''}`}
            onClick={() => {
              setTab(id);
              if (id === 'sessions') ReforgeHud.requestGuestList();
            }}
          >
            {t(id === 'settings' ? 'reforgeHud.guest.tabSettings' : 'reforgeHud.guest.tabSessions')}
          </div>
        ))}
      </div>
      <div className="rh-body" data-no-drag="true">
        {tab === 'settings' ? (
          <>
            <MuText className="rh-line" text={t('reforgeHud.guest.restrictions')} color={TEXT_COLOR.orange} />
            <div className="rh-perms">
              {PERMISSION_KEYS.slice(0, GUEST_PERMISSIONS).map((key, i) => {
                const on = (permissions & (1 << i)) !== 0;
                return (
                  <label key={i} className="rh-perm">
                    <input type="checkbox" checked={on} onChange={() => setPermissions(p => p ^ (1 << i))} />
                    {t(key)}
                  </label>
                );
              })}
            </div>
            <div className="rh-row">
              <MuText text={t('reforgeHud.guest.duration')} color={TEXT_COLOR.orange} />
              <span className="rh-stepper">
                <span className="rh-step" onClick={() => setHours(h => Math.max(GUEST_HOURS.min, h - 1))} title={t('reforgeHud.guest.minusOneHour')}>
                  -
                </span>
                {t('reforgeHud.guest.hours', { hours })}
                <span className="rh-step" onClick={() => setHours(h => Math.min(GUEST_HOURS.max, h + 1))} title={t('reforgeHud.guest.plusOneHour')}>
                  +
                </span>
              </span>
            </div>
            <MuText className="rh-line" text={t('reforgeHud.guest.generateHeader')} color={TEXT_COLOR.orange} />
            <input
              className="rh-input"
              maxLength={20}
              placeholder={t('reforgeHud.guest.sessionName')}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter') generate();
              }}
            />
            <div className="rh-button" onClick={generate}>
              {t('reforgeHud.guest.generate')}
            </div>
            <div className="rh-row">
              <MuText text={t('reforgeHud.guest.password')} color={TEXT_COLOR.orange} />
              <MuText text={password} color={generated?.success ? TEXT_COLOR.brightYellow : TEXT_COLOR.brightGray} />
            </div>
            {generated?.success && (
              <div className="rh-button" onClick={() => copy(generated.password)}>
                {t('reforgeHud.guest.copy')}
              </div>
            )}
            <MuText className="rh-line" text={t('reforgeHud.guest.hint')} color="rgb(150, 150, 150)" />
          </>
        ) : (
          <>
            <MuText className="rh-line" text={t('reforgeHud.guest.sessionCount', { count: sessions.length, max: GUEST_MAX_SESSIONS })} />
            {sessions.length === 0 && <MuText className="rh-line" text={t('reforgeHud.guest.noSessions')} color="rgb(150, 150, 150)" />}
            {sessions.map((s, i) => (
              <div key={i} className="rh-session">
                <div className="rh-row">
                  <MuText text={s.name} color={TEXT_COLOR.brightYellow} />
                  <MuText text={timeLeft(ReforgeHud.guestSecondsLeft(s, now))} />
                </div>
                <div className="rh-row">
                  <span
                    className="rh-link"
                    title={t('reforgeHud.guest.copyPasswordTip')}
                    onClick={() => s.password && copy(s.password)}
                  >
                    {s.password || t('reforgeHud.guest.notStored')}
                  </span>
                  <span className="rh-link danger" title={t('reforgeHud.guest.deleteSessionTip')} onClick={() => setRevoke(s)}>
                    X
                  </span>
                </div>
              </div>
            ))}
            {revoke && (
              <div className="rh-confirm">
                <MuText className="rh-line" text={t('reforgeHud.guest.revokeQuestion', { name: revoke.name })} />
                <MuText className="rh-line" text={t('reforgeHud.guest.revokeDisconnects')} color="rgb(150, 150, 150)" />
                <div className="rh-row">
                  <div
                    className="rh-button"
                    onClick={() => {
                      ReforgeHud.revokeGuest(revoke);
                      setRevoke(null);
                      ReforgeHud.requestGuestList();
                    }}
                  >
                    {t('reforgeHud.ok')}
                  </div>
                  <div className="rh-button" onClick={() => setRevoke(null)}>
                    {t('reforgeHud.cancel')}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MuItemWindow>
  );
});

/** Registered by `window.ts`. */
export const ReforgeHudWindows = observer(() => {
  useEventBus('keyPressed', key => {
    if (!togglesWindow(GUEST_ACCESS_KEY, key)) return;
    // A guest's login gets no window (`RefuseForGuest`).
    if (ReforgeHud.isGuest) {
      addNotification(t('reforgeHud.guest.ownerOnly'), 'error');
      return;
    }
    runInAction(() => MuWindows.setOpen(GUEST_ACCESS_WINDOW, !MuWindows.isOpen(GUEST_ACCESS_WINDOW)));
  });
  return (
    <>
      <PartyBuffs />
      {MuWindows.isOpen(GUEST_ACCESS_WINDOW) && !ReforgeHud.isGuest && <GuestAccessWindow />}
    </>
  );
});
