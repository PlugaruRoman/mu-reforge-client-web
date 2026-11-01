import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import { GameOptions } from '@/controllers/settings';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { useUiStageScale } from '@/controllers/interface/components/ui_stage';
import { togglesWindow } from '@/controllers/interface/components/module_window';
import { useEventBus } from '@/controllers/interface/hooks';
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
import { AccountButton, AccountConfirm } from '../_shared/accountWidgets';
import { ReforgeShell, RfButton, RfFooter, RfList, RfTableHead, RfTabs } from '../_shared/reforgeShell';

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

/**
 * `CGuestAccessWindow` (reforge_guest_access.rml), 230 x 404: Settings (the eleven permissions in two
 * columns, the hour stepper, the session name, the generated password, Generate | Copy) and Sessions
 * (Name | Time left, rows of 32 with Copy and Delete); the footer holds the tab's hint; Close.
 */
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
    ReforgeHud.generateGuest(permissions, hours, name);
  };

  const password = !generated
    ? t('reforgeHud.guest.notGenerated')
    : generated.pending
      ? '...'
      : generated.success
        ? generated.password
        : t('reforgeHud.guest.refused');
  const shown = !!generated?.success && !generated.pending;

  return (
    <ReforgeShell
      id={GUEST_ACCESS_WINDOW}
      title={t('reforgeHud.guest.title')}
      height={404}
      className="guest-access"
      onClose={() => {
        if (revoke) setRevoke(null);
        else close();
      }}
      overlay={
        revoke && (
          <AccountConfirm
            lines={[
              { text: t('reforgeHud.guest.revokeQuestion', { name: revoke.name }), bold: true },
              { text: t('reforgeHud.guest.revokeDisconnects') },
            ]}
            buttons={[
              {
                label: t('reforgeHud.ok'),
                onClick: () => {
                  ReforgeHud.revokeGuest(revoke);
                  setRevoke(null);
                  ReforgeHud.requestGuestList();
                },
              },
              { label: t('reforgeHud.cancel'), onClick: () => setRevoke(null) },
            ]}
          />
        )
      }
    >
      <RfTabs
        tabs={[
          { id: 'settings' as const, label: t('reforgeHud.guest.tabSettings') },
          { id: 'sessions' as const, label: t('reforgeHud.guest.tabSessions'), live: sessions.length > 0 },
        ]}
        active={tab}
        onSelect={id => {
          setTab(id);
          if (id === 'sessions') ReforgeHud.requestGuestList();
        }}
      />
      {tab === 'settings' ? (
        <div className="ga-page">
          <RfTableHead className="ga-heading" columns={[{ label: t('reforgeHud.guest.restrictions') }]} />
          <div className="ga-perms">
            {PERMISSION_KEYS.slice(0, GUEST_PERMISSIONS).map((key, i) => {
              const on = (permissions & (1 << i)) !== 0;
              return (
                <div key={i} className={`ga-perm${on ? ' checked' : ''}`} onClick={() => setPermissions(p => p ^ (1 << i))}>
                  <span className="acct-box" />
                  <span className="ga-perm-label">{t(key)}</span>
                </div>
              );
            })}
          </div>
          <div className="ga-line ga-duration">
            <span className="ga-label">{t('reforgeHud.guest.duration')}</span>
            <span className="ga-stepper">
              <span className="ga-step" title={t('reforgeHud.guest.minusOneHour')} onClick={() => setHours(h => Math.max(GUEST_HOURS.min, h - 1))}>
                -
              </span>
              <span className="ga-step-value">{t('reforgeHud.guest.hours', { hours })}</span>
              <span className="ga-step" title={t('reforgeHud.guest.plusOneHour')} onClick={() => setHours(h => Math.min(GUEST_HOURS.max, h + 1))}>
                +
              </span>
            </span>
          </div>
          <RfTableHead className="ga-heading" columns={[{ label: t('reforgeHud.guest.generateHeader') }]} />
          <div className="ga-line">
            <span className="ga-label">{t('reforgeHud.guest.sessionName')}</span>
            <input
              className="acct-field ga-name-field"
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter') generate();
              }}
            />
          </div>
          <div className="ga-line">
            <span className="ga-label">{t('reforgeHud.guest.password')}</span>
            <span className={`ga-password${shown ? ' shown' : ''}${generated && !generated.pending && !generated.success ? ' failed' : ''}`}>
              {password}
            </span>
          </div>
          <div className="ga-buttons">
            <RfButton small label={t('reforgeHud.guest.generate')} disabled={!!generated?.pending} onClick={generate} />
            <RfButton small label={t('reforgeHud.guest.copy')} disabled={!shown} onClick={() => generated && copy(generated.password)} />
          </div>
        </div>
      ) : (
        <div className="ga-page">
          <RfTableHead
            className="ga-columns"
            columns={[{ label: t('reforgeHud.guest.colName') }, { label: t('reforgeHud.guest.colTimeLeft'), width: 64, align: 'right' }]}
          />
          <RfList height={228} className="ga-list">
            {sessions.length === 0 && <div className="ga-empty">{t('reforgeHud.guest.noSessions')}</div>}
            {sessions.map((s, i) => {
              const left = ReforgeHud.guestSecondsLeft(s, now);
              return (
                <div key={i} className={`rf-row ga-row${left <= 0 ? ' expired' : ''}`}>
                  <div className="ga-row-text">
                    <div className="ga-cols">
                      <span className="ga-col-name">{s.name}</span>
                      <span className="ga-col-time">{timeLeft(left)}</span>
                    </div>
                    <div className={`ga-row-password${s.password ? '' : ' missing'}`}>{s.password || t('reforgeHud.guest.notStored')}</div>
                  </div>
                  <AccountButton
                    className={`ga-icon${s.password ? '' : ' hidden'}`}
                    label={t('reforgeHud.guest.copy')}
                    title={t('reforgeHud.guest.copyPasswordTip')}
                    onClick={() => s.password && copy(s.password)}
                  />
                  <AccountButton className="ga-icon ga-delete" label="X" title={t('reforgeHud.guest.deleteSessionTip')} onClick={() => setRevoke(s)} />
                </div>
              );
            })}
          </RfList>
        </div>
      )}
      <RfFooter className="ga-footer">
        {tab === 'settings' ? t('reforgeHud.guest.hint') : t('reforgeHud.guest.sessionCount', { count: sessions.length, max: GUEST_MAX_SESSIONS })}
      </RfFooter>
    </ReforgeShell>
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
