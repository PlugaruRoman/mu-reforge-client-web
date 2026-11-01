import './style.less';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import {
  BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT,
  BTN_INPUT_CANCEL_X,
  BTN_INPUT_OK_X,
  BTN_WIDTH,
  BTN_Y,
  CANCEL_SPRITE,
  INPUT_HEIGHT,
  INPUT_SPRITE,
  INPUT_TEXT_INSET_X,
  INPUT_TEXT_INSET_Y,
  INPUT_WIDTH,
  INPUT_X,
  INPUT_Y,
  OK_SPRITE,
  TEXT_INSET_X,
  TEXT_LINE_HEIGHT,
  TEXT_LINES,
  TEXT_TOP,
  WIN_HEIGHT,
  WIN_WIDTH,
} from '@/controllers/interface/components/msg_window';
import { goldColor } from '@/controllers/item_rules';
import { moduleOn } from '@/modules/module';
import { Bag } from '@/modules/inventory';
import { Hero } from '@/modules/hero';
import { Social } from '@/modules/social/social';
import { StorageKind } from '@/modules/inventory/itemStorage';
import {
  ASSIGNABLE_RANKS,
  BankLock,
  GuildBank,
  GuildRank,
  PIN_DIGITS,
  isAcceptablePin,
  type GuildBankPrompt,
} from '@/modules/guild_bank';
import { ItemGrid, SQUARE, buildOccupancy, canPlace, itemSize } from '../../components/item_grid';
import {
  BUTTON_FRAMES,
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  BUTTON_Y,
  ALLIANCE_PLATE_TOP,
  CASTLE_BUTTON,
  COLUMNS,
  DEPOSIT_SPRITE,
  DEPOSIT_X,
  GRID_X,
  GRID_Y,
  GUILD_BUTTON,
  GUILD_BUTTON_SPRITE,
  HEAD_CLOSE,
  HINT_Y,
  LOCKED_SPRITE,
  LOCK_X,
  MONEY_HEIGHT,
  MONEY_SPRITE,
  MONEY_TEXT_RIGHT,
  MONEY_TEXT_Y,
  MONEY_WIDTH,
  MONEY_X,
  MONEY_Y,
  PAGER,
  ROWS,
  SETTINGS_BUTTON,
  TITLE_Y,
  UNLOCKED_SPRITE,
  WITHDRAW_SPRITE,
  WARS_PLATE_TOP,
  WITHDRAW_X,
} from './layout';
import { SidePlate } from '../_shared/sidePlates';
import { playUiSound } from '@/controllers/sound/sfx';
import { ReforgeShell, RfButton, RfFooter, RfList, RfTableHead } from '../_shared/reforgeShell';

const BANK_ID = 'guild_bank';
const SETTINGS_ID = 'guild_settings';

const IconButton = observer(({ x, file, hint, disabled, onClick }: { x: number; file: string; hint: string; disabled?: boolean; onClick: () => void }) => (
  <div className={`window-button${disabled ? ' disabled' : ''}`} data-no-drag="true" style={{ left: x, top: BUTTON_Y }}>
    <MuButton file={file} width={BUTTON_WIDTH} height={BUTTON_HEIGHT} frames={BUTTON_FRAMES} disabled={disabled} onClick={onClick}>
      <span className="button-tooltip">{hint}</span>
    </MuButton>
  </div>
));

/** The PIN button: every member unlocks, setting and removing it is the guild master's (`OpenPinDialog`). */
function pinPrompt(): GuildBankPrompt | null {
  if (GuildBank.lock === BankLock.Locked) return 'unlock';
  if (!Social.isGuildMaster) return null;
  return GuildBank.lock === BankLock.Unlocked ? 'remove-pin' : 'set-pin';
}

/**
 * Our client's `CGuildBankWindow` (UI/GuildBank/GuildBankWindow.cpp): one page of the shared bank
 * beside the inventory. An item dragged in from the bag is deposited (DC 03), a right click takes a
 * bank item out (DC 04), a click picks a bank item and a click on a free square moves it (DC 10).
 */
export const GuildBankWindow = observer(() => {
  const gridRef = useRef<HTMLDivElement>(null);
  if (!GuildBank.open) return null;

  const locked = GuildBank.locked;
  const picked = Bag.pickedItem;
  const fromBag = picked?.fromStorage === StorageKind.Inventory;
  const selected = GuildBank.selected;
  const close = () => GuildBank.close();
  const column = 1 + (MuWindows.isOpen('inventory') ? 1 : 0) + (MuWindows.isOpen('character_info') ? 1 : 0);

  /** A click on a free square while a bank item is chosen moves it there; ItemGrid only sees occupied squares. */
  const onPointerDownCapture = (event: React.PointerEvent) => {
    if (event.button !== 0 || selected === null || picked) return;
    const box = gridRef.current?.getBoundingClientRect();
    const item = GuildBank.items[selected];
    if (!box || !item) return;
    const scale = box.width / (COLUMNS * SQUARE);
    const { w, h } = itemSize(item);
    const x = Math.floor((event.clientX - box.left) / scale / SQUARE - (w - 1) / 2);
    const y = Math.floor((event.clientY - box.top) / scale / SQUARE - (h - 1) / 2);
    const others = GuildBank.items.map((it, i) => (i === selected ? null : it));
    const { squares } = buildOccupancy(others, 0, COLUMNS, ROWS);
    const under = squares[Math.floor((event.clientY - box.top) / scale / SQUARE) * COLUMNS + Math.floor((event.clientX - box.left) / scale / SQUARE)];
    if (under) return; // on another item: ItemGrid's onPick chooses that one instead
    event.stopPropagation();
    if (canPlace(squares, COLUMNS, ROWS, x, y, w, h)) GuildBank.moveSelected(y * COLUMNS + x);
    else GuildBank.select(null);
  };

  return (
    <MuItemWindow id={BANK_ID} className="guild-bank" column={column} label={t('guildBank.title')} onClose={close}>
      <div className="window-title" style={{ top: TITLE_Y }}>{t('guildBank.title')}</div>
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={close} />
      {selected !== null && <div className="gb-hint" style={{ top: HINT_Y }}>{t('guildBank.moveHint')}</div>}

      <div
        ref={gridRef}
        className="gb-grid"
        style={{ left: GRID_X, top: GRID_Y, width: COLUMNS * SQUARE, height: ROWS * SQUARE }}
        onPointerDownCapture={onPointerDownCapture}
      >
        <ItemGrid
          items={GuildBank.items}
          columns={COLUMNS}
          rows={ROWS}
          left={0}
          top={0}
          disabled={locked || !!Bag.pendingItemMove}
          dropTint={picked ? (fromBag && !locked ? 'ok' : 'ban') : 'none'}
          marked={square => square === selected}
          onPick={square => GuildBank.select(square === selected ? null : square)}
          onPlace={square => {
            const from = Bag.pickedItem;
            Bag.cancelPickedItem();
            // The bag keeps the item until the server's ItemRemoved: a refusal changes nothing.
            if (from?.fromStorage === StorageKind.Inventory) GuildBank.deposit(from.fromSlot, square);
          }}
          onUse={square => GuildBank.withdraw(square)}
        />
        {locked && <div className="gb-locked">{t('guildBank.locked')}</div>}
      </div>

      <MuSpriteFrame file={MONEY_SPRITE} width={MONEY_WIDTH} height={MONEY_HEIGHT} style={{ position: 'absolute', left: MONEY_X, top: MONEY_Y }} />
      <div className="gb-money" style={{ right: MONEY_TEXT_RIGHT, top: MONEY_TEXT_Y, color: goldColor(GuildBank.money) }}>
        {GuildBank.money.toLocaleString('en-US')}
      </div>

      <IconButton x={DEPOSIT_X} file={DEPOSIT_SPRITE} hint={t('guildBank.depositZen')} disabled={locked} onClick={() => GuildBank.openPrompt('deposit')} />
      <IconButton
        x={WITHDRAW_X}
        file={WITHDRAW_SPRITE}
        hint={t('guildBank.withdrawZen')}
        disabled={locked || !GuildBank.canWithdraw}
        onClick={() => GuildBank.openPrompt('withdraw')}
      />
      <IconButton
        x={LOCK_X}
        file={GuildBank.lock === BankLock.None ? UNLOCKED_SPRITE : LOCKED_SPRITE}
        hint={t('guildBank.password')}
        disabled={!pinPrompt()}
        onClick={() => {
          const prompt = pinPrompt();
          if (prompt) GuildBank.openPrompt(prompt);
        }}
      />

      {GuildBank.pageCount > 1 && (
        <div className="gb-pager" data-no-drag="true" style={{ left: PAGER.x, top: PAGER.y, width: PAGER.width, height: PAGER.height }}>
          <span
            className={`gb-page-btn${GuildBank.page > 0 && !locked ? '' : ' disabled'}`}
            title={t('guildBank.previousPage')}
            onClick={() => GuildBank.changePage(-1)}
          >
            {'<'}
          </span>
          <span className="gb-page-text">{`${GuildBank.page + 1}/${GuildBank.pageCount}`}</span>
          <span
            className={`gb-page-btn${GuildBank.page + 1 < GuildBank.pageCount && !locked ? '' : ' disabled'}`}
            title={t('guildBank.nextPage')}
            onClick={() => GuildBank.changePage(1)}
          >
            {'>'}
          </span>
        </div>
      )}
    </MuItemWindow>
  );
});

const PROMPT_TEXT: Record<GuildBankPrompt, [TextKey, TextKey | null]> = {
  deposit: ['guildBank.depositZen', 'guildBank.depositAsk'],
  withdraw: ['guildBank.withdrawZen', 'guildBank.withdrawAsk'],
  unlock: ['guildBank.pinEnter', 'guildBank.pinDigits'],
  'set-pin': ['guildBank.pinChoose', 'guildBank.pinDigits'],
  'repeat-pin': ['guildBank.pinRepeat', 'guildBank.pinDigits'],
  'remove-pin': ['guildBank.password', 'guildBank.pinRemove'],
};

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

/**
 * The bank's message boxes (GuildBankWindow.cpp `ShowZenDialog`, `ShowUnlockDialog`,
 * `ShowChoosePinDialog` / `ShowRepeatPinDialog`, `ShowRemovePinDialog`) on the classic 352x113 box.
 */
export const GuildBankPrompts = observer(() => {
  const prompt = GuildBank.prompt;
  const [value, setValue] = useState('');
  const [error, setError] = useState<TextKey | null>(null);
  useEffect(() => {
    setValue('');
    setError(null);
  }, [prompt]);

  if (!prompt || !GuildBank.open) return null;

  const zen = prompt === 'deposit' || prompt === 'withdraw';
  const pin = prompt === 'unlock' || prompt === 'set-pin' || prompt === 'repeat-pin';
  const max = prompt === 'deposit' ? Hero.money : GuildBank.money;
  const amount = Number(value || '0');
  const okDisabled = (zen && (amount <= 0 || amount > max)) || (pin && value.length !== PIN_DIGITS);
  const [title, hint] = PROMPT_TEXT[prompt];

  const cancel = () => {
    GuildBank.pendingPin = '';
    GuildBank.openPrompt(null);
  };
  const confirm = () => {
    if (okDisabled) return;
    switch (prompt) {
      case 'deposit':
      case 'withdraw':
        GuildBank.moveMoney(prompt === 'deposit', amount);
        break;
      case 'unlock':
        GuildBank.unlock(value);
        break;
      case 'set-pin':
        if (!isAcceptablePin(value)) {
          setError('guildBank.pinSameDigits');
          return;
        }
        GuildBank.pendingPin = value;
        GuildBank.openPrompt('repeat-pin');
        return;
      case 'repeat-pin':
        if (value !== GuildBank.pendingPin) {
          setError('guildBank.pinMismatch');
          return;
        }
        GuildBank.setPin(value);
        break;
      case 'remove-pin':
        GuildBank.removePin();
        break;
    }
    cancel();
  };
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Enter') confirm();
    else if (event.key === 'Escape') cancel();
    event.stopPropagation();
  };
  const hasField = zen || pin;

  return (
    <div className="gb-prompt-layer" onKeyDown={onKeyDown}>
      <MuSpriteFrame file={BACK_SPRITE} width={WIN_WIDTH} height={WIN_HEIGHT} className="gb-prompt">
        <div
          className="gb-prompt-text"
          style={{ left: TEXT_INSET_X, right: TEXT_INSET_X, top: TEXT_TOP, height: TEXT_LINE_HEIGHT * TEXT_LINES, lineHeight: `${TEXT_LINE_HEIGHT}px` }}
        >
          <div className="gb-prompt-line">{t(title)}</div>
          <div className={`gb-prompt-line${error ? ' error' : ''}`}>{t(error ?? hint ?? title)}</div>
        </div>
        {hasField && (
          <MuSpriteFrame file={INPUT_SPRITE} width={INPUT_WIDTH} height={INPUT_HEIGHT} style={{ position: 'absolute', left: INPUT_X, top: INPUT_Y }}>
            <input
              className="gb-prompt-input"
              aria-label={t(title)}
              autoFocus
              type={pin ? 'password' : 'text'}
              inputMode="numeric"
              maxLength={pin ? PIN_DIGITS : 10}
              value={value}
              spellCheck={false}
              onChange={event => {
                setValue(digitsOnly(event.target.value));
                setError(null);
              }}
              style={{ paddingLeft: INPUT_TEXT_INSET_X, paddingTop: INPUT_TEXT_INSET_Y }}
            />
          </MuSpriteFrame>
        )}
        {zen && (
          <span className="gb-prompt-max" data-no-drag="true" style={{ left: INPUT_X + INPUT_WIDTH - 24, top: INPUT_Y - 14 }} onClick={() => setValue(String(max))}>
            {t('guildBank.max')}
          </span>
        )}
        <MuButton
          file={OK_SPRITE}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          disabled={okDisabled}
          onClick={confirm}
          style={{ position: 'absolute', left: hasField ? BTN_INPUT_OK_X : BTN_BOTH_OK_X, top: BTN_Y }}
        />
        <MuButton
          file={CANCEL_SPRITE}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={cancel}
          style={{ position: 'absolute', left: hasField ? BTN_INPUT_CANCEL_X : BTN_BOTH_CANCEL_X, top: BTN_Y }}
        />
      </MuSpriteFrame>
    </div>
  );
});

const RANK_TEXT: Record<number, TextKey> = {
  [GuildRank.AssistantMaster]: 'guildSettings.rank.assistant',
  [GuildRank.BattleMaster]: 'guildSettings.rank.battleMaster',
  [GuildRank.Veteran]: 'guildSettings.rank.veteran',
  [GuildRank.EliteMember]: 'guildSettings.rank.eliteMember',
  [GuildRank.NormalMember]: 'guildSettings.rank.member',
  [GuildRank.Recruit]: 'guildSettings.rank.recruit',
};

const Check = observer(({ on, readOnly, onClick }: { on: boolean; readOnly: boolean; onClick: () => void }) => (
  <span className={`gs-check${on ? ' on' : ''}${readOnly ? ' read-only' : ''}`} data-no-drag="true" onClick={readOnly ? undefined : onClick}>
    {on ? 'v' : ''}
  </span>
));

/**
 * Our client's `CGuildSettingsWindow` (UI/GuildSettings/GuildSettingsWindow.cpp): which ranks may put
 * items and zen into the bank and take them out. Edited here, sent on Save (DC 0E); the server's
 * answer (DC 0D) is the baseline Revert goes back to.
 */
export const GuildSettingsWindow = observer(() => {
  if (!GuildBank.settingsOpen) return null;
  const close = () => GuildBank.openSettings(false);
  const readOnly = !Social.isGuildMaster;
  const status: TextKey = readOnly
    ? 'guildSettings.readOnly'
    : GuildBank.settingsDirty
      ? 'guildSettings.unsaved'
      : GuildBank.settingsSaved
        ? 'guildSettings.saved'
        : 'guildSettings.masterFullAccess';

  const has = (rank: number, withdraw: boolean) => !!((withdraw ? GuildBank.withdrawFlags : GuildBank.depositFlags) & (1 << rank));
  // A caption sets the whole column, or clears it when every rank already has it (`ToggleColumn`).
  const toggleColumn = (withdraw: boolean) => {
    if (readOnly) return;
    playUiSound('click');
    const all = ASSIGNABLE_RANKS.every(rank => has(rank, withdraw));
    for (const rank of ASSIGNABLE_RANKS) if (has(rank, withdraw) === all) GuildBank.toggleRight(rank, withdraw);
  };
  const canSave = !readOnly && GuildBank.settingsDirty;

  return (
    <ReforgeShell
      id={SETTINGS_ID}
      title={t('guildSettings.title')}
      height={320}
      open
      closeButton={false}
      className="guild-settings"
      onClose={close}
    >
      <RfTableHead className="gs-section" columns={[{ label: t('guildSettings.bankAccess'), align: 'center' }]} />
      <div className="gs-legend">{t('guildSettings.legend')}</div>
      <div className="gs-columns">
        <span className="gs-rank" />
        <span className={`gs-cell gs-head${readOnly ? ' locked' : ''}`} onClick={() => toggleColumn(false)}>
          {t('guildSettings.columnIn')}
        </span>
        <span className={`gs-cell gs-head${readOnly ? ' locked' : ''}`} onClick={() => toggleColumn(true)}>
          {t('guildSettings.columnOut')}
        </span>
      </div>
      <RfList height={140} className="gs-list">
        {ASSIGNABLE_RANKS.map(rank => (
          <div key={rank} className="rf-row gs-row">
            <span className="gs-rank">{t(RANK_TEXT[rank])}</span>
            <span className="gs-cell">
              <Check on={has(rank, false)} readOnly={readOnly} onClick={() => GuildBank.toggleRight(rank, false)} />
            </span>
            <span className="gs-cell">
              <Check on={has(rank, true)} readOnly={readOnly} onClick={() => GuildBank.toggleRight(rank, true)} />
            </span>
          </div>
        ))}
      </RfList>
      <RfFooter className={`gs-status ${GuildBank.settingsDirty ? 'unsaved' : GuildBank.settingsSaved ? 'saved' : 'note'}`}>{t(status)}</RfFooter>
      <div className="gs-actions">
        <RfButton small label={t('guildSettings.save')} disabled={!canSave} onClick={() => GuildBank.saveSettings()} />
        <RfButton small label={t('guildSettings.revert')} disabled={!canSave} onClick={() => GuildBank.revertSettings()} />
        <RfButton small label={t('common.close')} onClick={close} />
      </div>
    </ReforgeShell>
  );
});

const GuildRowButton = observer(({ x, y, label, title, disabled, onClick }: { x: number; y: number; label: string; title?: string; disabled?: boolean; onClick: () => void }) => (
  <div data-no-drag="true" title={title} style={{ position: 'absolute', left: x, top: y }}>
    <MuButton
      file={GUILD_BUTTON_SPRITE}
      width={GUILD_BUTTON.width}
      height={GUILD_BUTTON.height}
      frames={{ up: 0, active: 1, down: 2 }}
      color={TEXT_COLOR.brightGray}
      activeColor={TEXT_COLOR.white}
      label={label}
      disabled={disabled}
      onClick={onClick}
      labelStyle={{ fontSize: 10 }}
    />
  </div>
));

/** The guild browser's two windows (versions/shared/ui/windows/guild_browser). */
const GUILD_WARS_WINDOW = 'guild_wars';
const GUILD_ALLIANCE_WINDOW = 'guild_alliance';

const toggle = (id: string) => MuWindows.setOpen(id, !MuWindows.isOpen(id));

/**
 * Our guild window's parts (UI/Reforge/ReforgeGuildButtons.cpp, guild_info.rml `#reforge_guild_parts`):
 * the guild master's Guild Wars and Guild Alliance plates off the left edge (each toggles its window
 * of the guild browser), Settings beside Disband on the Guild tab, and Castle on the exit button's
 * row while the guild owns the castle (DC 0F). Nothing on a world without our guild bank.
 */
export const GuildReforgeButtons = observer(() => {
  if (!moduleOn('guild_bank') || !Social.myGuild) return null;
  const master = Social.isGuildMaster;
  const browser = master && moduleOn('guild_browser');
  return (
    <>
      {browser && (
        <>
          <SidePlate
            top={WARS_PLATE_TOP}
            file="newui_guildinfo_btn_wars.OZT"
            title={t('guild.plateWars')}
            description={t('guild.plateWarsTip')}
            active={MuWindows.isOpen(GUILD_WARS_WINDOW)}
            onClick={() => toggle(GUILD_WARS_WINDOW)}
          />
          <SidePlate
            top={ALLIANCE_PLATE_TOP}
            file="newui_guildinfo_btn_alliance.OZT"
            title={t('guild.plateAlliance')}
            description={t('guild.plateAllianceTip')}
            active={MuWindows.isOpen(GUILD_ALLIANCE_WINDOW)}
            onClick={() => toggle(GUILD_ALLIANCE_WINDOW)}
          />
        </>
      )}
      {master && Social.guildTab === 'info' && (
        <GuildRowButton
          x={SETTINGS_BUTTON.x}
          y={SETTINGS_BUTTON.y}
          label={t('guildSettings.button')}
          onClick={() => GuildBank.openSettings(!GuildBank.settingsOpen)}
        />
      )}
      {GuildBank.ownsCastle && (
        <GuildRowButton
          x={CASTLE_BUTTON.x}
          y={CASTLE_BUTTON.y}
          label={t('guildCastle.label')}
          title={t('guildCastle.hint')}
          onClick={() => {
            GuildBank.warpToCastle();
            runInAction(() => {
              Social.guildWindowEnabled = false;
            });
          }}
        />
      )}
    </>
  );
});
