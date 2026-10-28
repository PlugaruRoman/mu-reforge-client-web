import './style.less';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import type { Item } from '@/ecs/world';
import { MuWindows } from '@/controllers/interface/windowManager';
import { useWindowChrome } from '@/controllers/interface/components/mu_window';
import { togglesWindow } from '@/controllers/interface/components/module_window';
import { ItemIcon } from '@/controllers/interface/components/item_icon';
import { useEventBus } from '@/controllers/interface/hooks';
import { playUiSound } from '@/controllers/sound/sfx';
import { Bag } from '@/modules/inventory';
import {
  CATEGORY_COUNT,
  ItemCollections,
  SlotFlag,
  bonusFormat,
  canRegister,
  filledCount,
  formatHundredths,
  has,
  isComplete,
  summarize,
  visibleIndexes,
  type Collection,
  type CollectionBonus,
  type CollectionSlot,
} from '@/modules/item_collections';
import { itemBaseName } from '@versions/shared/items/itemsDatabase';

/**
 * `CItemCollectionWindow` (our client's UI/ItemCollections/ItemCollectionWindow.cpp,
 * reforge_item_collections.rml): the server's collections eight to a page, filtered by category, each
 * with its state, the items it asks for (an open slot dimmed, a registered one gold, one an inventory
 * item fits framed green) and its bonus. A click on a green slot asks, after a confirmation, to register
 * the weakest fitting inventory item (the item is destroyed). ';' toggles it, as in our client
 * (UI/Reforge/ReforgeHotkeys.cpp, VK_OEM_1); opening asks the server for the catalog (FA 01).
 */

export const ITEM_COLLECTIONS_ID = 'item_collections';
/** VK_OEM_1 (0xBA), our client's key. */
const HOT_KEY = 'Semicolon';

const WIDTH = 560;
const HEIGHT = 400;
const ROWS_PER_PAGE = 8;
const ROW_Y = 92;
const ROW_HEIGHT = 34;
const NAME_X = 12;
const SLOTS_X = 172;
const SLOT_SIZE = 32;
const SLOT_PITCH = 38;
const BONUS_X = 444;
/** The additional option grows 4 per level, except on jewelry (group 13) (ReforgeItemCollections.h:43-45). */
const JEWELRY_GROUP = 13;
const OPTION_VALUE_PER_LEVEL = 4;

const TAB_KEYS: readonly TextKey[] = [
  'itemCollections.tab.0',
  'itemCollections.tab.1',
  'itemCollections.tab.2',
  'itemCollections.tab.3',
  'itemCollections.tab.4',
];
const DEFENSE_OPTIONS: readonly TextKey[] = [
  'itemCollections.opt.d1',
  'itemCollections.opt.d2',
  'itemCollections.opt.d3',
  'itemCollections.opt.d4',
  'itemCollections.opt.d5',
  'itemCollections.opt.d6',
];
const ATTACK_OPTIONS: readonly TextKey[] = [
  'itemCollections.opt.a1',
  'itemCollections.opt.a2',
  'itemCollections.opt.a3',
  'itemCollections.opt.a4',
  'itemCollections.opt.a5',
  'itemCollections.opt.a6',
];

type TipLine = { text: string; tone: 'gold' | 'white' | 'green' | 'blue' | 'red' | 'yellow' | 'gray' };

const slotItem = (slot: CollectionSlot): Item => ({
  group: slot.group,
  num: slot.number,
  lvl: slot.minimumLevel,
  isExcellent: has(slot, SlotFlag.Excellent),
  isAncient: has(slot, SlotFlag.Ancient),
});

/** `SlotItemName`: the item's name, `+level` when the slot asks for one. */
function slotName(slot: CollectionSlot): string {
  const name = itemBaseName(slot.group, slot.number) || '?';
  return slot.minimumLevel > 0 ? `${name} +${slot.minimumLevel}` : name;
}

/** `BonusText` (ItemCollectionText.cpp): "Damage +1.5%", "Max HP +50", "Damage Taken -2%". */
export function bonusText(bonus: CollectionBonus): string {
  if (bonus.type < 1 || bonus.type > 15) return '?';
  const name = t(`itemCollections.bonus.${bonus.type}` as TextKey);
  const value = formatHundredths(bonus.hundredths);
  switch (bonusFormat(bonus.type)) {
    case 'flat':
      return `${name} +${value}`;
    case 'decrease':
      return `${name} -${value}%`;
    default:
      return `${name} +${value}%`;
  }
}

function statusText(collection: Collection): string {
  if (isComplete(collection)) return t('itemCollections.status.completed');
  const done = filledCount(collection);
  return done > 0
    ? t('itemCollections.status.inProgress', { done, total: collection.slots.length })
    : t('itemCollections.status.notStarted');
}

/** `SlotTooltip` (ItemCollectionText.cpp). */
function slotTooltip(slot: CollectionSlot): TipLine[] {
  const excellent = has(slot, SlotFlag.Excellent);
  const ancient = has(slot, SlotFlag.Ancient);
  const lines: TipLine[] = [{ text: slotName(slot), tone: ancient ? 'blue' : excellent ? 'green' : 'gold' }];
  if (slot.minimumLevel > 0) lines.push({ text: t('itemCollections.tip.level', { level: slot.minimumLevel }), tone: 'white' });
  if (excellent) {
    const pool = has(slot, SlotFlag.AttackOptions) ? ATTACK_OPTIONS : DEFENSE_OPTIONS;
    const named = pool.filter((_, n) => (slot.excellentMask & (1 << n)) !== 0);
    if (named.length === 0) lines.push({ text: t('itemCollections.tip.excellent'), tone: 'green' });
    for (const key of named) lines.push({ text: t('itemCollections.tip.excellentOption', { option: t(key) }), tone: 'green' });
  }
  if (ancient) lines.push({ text: t('itemCollections.tip.ancient'), tone: 'blue' });
  if (has(slot, SlotFlag.Luck)) lines.push({ text: t('itemCollections.tip.luck'), tone: 'blue' });
  if (slot.minimumOptionLevel > 0) {
    lines.push({
      text:
        slot.group === JEWELRY_GROUP
          ? t('itemCollections.tip.optionLevel', { level: slot.minimumOptionLevel })
          : t('itemCollections.tip.option', { value: slot.minimumOptionLevel * OPTION_VALUE_PER_LEVEL }),
      tone: 'blue',
    });
  }
  if (has(slot, SlotFlag.Filled)) lines.push({ text: t('itemCollections.tip.registered'), tone: 'yellow' });
  else if (has(slot, SlotFlag.Available)) lines.push({ text: t('itemCollections.tip.clickToRegister'), tone: 'green' });
  else lines.push({ text: t('itemCollections.tip.noItem'), tone: 'red' });
  return lines;
}

/** `CollectionTooltip` (ItemCollectionText.cpp). */
function collectionTooltip(collection: Collection): TipLine[] {
  const complete = isComplete(collection);
  return [
    { text: collection.name, tone: 'gold' },
    ...collection.bonuses.map(b => ({ text: bonusText(b), tone: complete ? ('blue' as const) : ('white' as const) })),
    { text: t(complete ? 'itemCollections.tip.active' : 'itemCollections.tip.inactive'), tone: 'gray' },
  ];
}

type Hover = { lines: TipLine[]; x: number; y: number };
type Pending = { collection: Collection; slot: number };

const close = () => MuWindows.setOpen(ITEM_COLLECTIONS_ID, false);

/** Opens it and asks for the catalog (`Show`: `SendItemCollectionListRequest` on every open); a button clicks itself. */
export function toggleItemCollections(click = true): void {
  const open = !MuWindows.isOpen(ITEM_COLLECTIONS_ID);
  MuWindows.setOpen(ITEM_COLLECTIONS_ID, open);
  if (open) ItemCollections.requestList();
  if (click) playUiSound('click');
}

export const ItemCollectionsWindow = observer(() => {
  const [category, setCategory] = useState(0);
  const [page, setPage] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const open = MuWindows.isOpen(ITEM_COLLECTIONS_ID);
  const chrome = useWindowChrome(ITEM_COLLECTIONS_ID, {
    width: WIDTH,
    height: HEIGHT,
    onClose: () => {
      if (pending) setPending(null);
      else close();
      playUiSound('click');
    },
  });

  useEventBus('keyPressed', key => {
    if (togglesWindow(HOT_KEY, key)) toggleItemCollections();
  });

  if (!open) return null;

  const collections = ItemCollections.collections;
  const visible = visibleIndexes(collections, category);
  const pages = Math.max(1, Math.ceil(visible.length / ROWS_PER_PAGE));
  const current = Math.min(page, pages - 1);
  const shown = visible.slice(current * ROWS_PER_PAGE, (current + 1) * ROWS_PER_PAGE).map(i => collections[i]);
  const progress = summarize(collections);

  const tip = (lines: TipLine[], x: number, y: number) => setHover({ lines, x, y });

  const clickSlot = (collection: Collection, index: number) => {
    const slot = collection.slots[index];
    // `ClickSlot`: only a slot an inventory item fits, and nothing on the cursor.
    if (!slot || !canRegister(slot) || Bag.pickedItem) return;
    playUiSound('click');
    setPending({ collection, slot: index });
  };

  return (
    <div
      ref={chrome.ref as React.Ref<HTMLDivElement>}
      role="dialog"
      aria-label={t('itemCollections.title')}
      tabIndex={-1}
      className="item-collections"
      onPointerDown={chrome.onPointerDown}
      style={chrome.style}
    >
      <div className="ic-title">{t('itemCollections.title')}</div>
      <div className="ic-close" data-no-drag="true" title={t('itemCollections.close')} onClick={close} />

      <div className="ic-tabs" data-no-drag="true">
        {Array.from({ length: CATEGORY_COUNT }, (_, i) => (
          <div
            key={i}
            className={`ic-tab${category === i ? ' active' : ''}`}
            onClick={() => {
              if (i === category) return;
              setCategory(i);
              setPage(0);
              playUiSound('click');
            }}
          >
            {t(TAB_KEYS[i])}
          </div>
        ))}
      </div>

      <div className="ic-stats">
        <span>{t('itemCollections.stat.collections', { done: progress.completed, total: progress.collections })}</span>
        <span>{t('itemCollections.stat.items', { done: progress.filledSlots, total: progress.slots })}</span>
      </div>

      <div className="ic-head" style={{ left: NAME_X }}>{t('itemCollections.head.name')}</div>
      <div className="ic-head" style={{ left: SLOTS_X }}>{t('itemCollections.head.items')}</div>
      <div className="ic-head" style={{ left: BONUS_X }}>{t('itemCollections.head.bonus')}</div>

      {shown.length === 0 && (
        <div className="ic-empty">{t(ItemCollections.hasCatalog ? 'itemCollections.empty' : 'itemCollections.loading')}</div>
      )}

      {shown.map((collection, row) => {
        const y = ROW_Y + row * ROW_HEIGHT;
        const state = isComplete(collection) ? 'complete' : filledCount(collection) > 0 ? 'started' : 'idle';
        return (
          <div key={collection.number} className={`ic-row ${state}`} style={{ top: y, height: ROW_HEIGHT - 2 }}>
            <div
              className="ic-name"
              style={{ left: NAME_X }}
              onPointerEnter={() => tip(collectionTooltip(collection), NAME_X, y + ROW_HEIGHT)}
              onPointerLeave={() => setHover(null)}
            >
              <div className="ic-name-text">{collection.name}</div>
              <div className="ic-status">{statusText(collection)}</div>
            </div>
            {collection.slots.map((slot, s) => {
              const look = has(slot, SlotFlag.Filled) ? 'filled' : has(slot, SlotFlag.Available) ? 'fits' : 'open';
              const x = SLOTS_X + s * SLOT_PITCH;
              return (
                <div
                  key={s}
                  className={`ic-slot ${look}${has(slot, SlotFlag.Ancient) ? ' ancient' : ''}`}
                  data-no-drag="true"
                  style={{ left: x, width: SLOT_SIZE, height: SLOT_SIZE }}
                  onClick={() => clickSlot(collection, s)}
                  onPointerEnter={() => tip(slotTooltip(slot), x, y)}
                  onPointerLeave={() => setHover(null)}
                >
                  <ItemIcon item={slotItem(slot)} />
                  {slot.minimumLevel > 0 && <span className="ic-level">+{slot.minimumLevel}</span>}
                </div>
              );
            })}
            <div className="ic-bonuses" style={{ left: BONUS_X }}>
              {collection.bonuses.map((b, i) => (
                <div key={i}>{bonusText(b)}</div>
              ))}
            </div>
          </div>
        );
      })}

      {pages > 1 && (
        <div className="ic-pager" data-no-drag="true">
          <div
            className={`ic-page-btn${current > 0 ? '' : ' disabled'}`}
            title={t('itemCollections.prev')}
            onClick={() => current > 0 && (setPage(current - 1), playUiSound('click'))}
          >
            {'<'}
          </div>
          <span>{`${current + 1} / ${pages}`}</span>
          <div
            className={`ic-page-btn${current + 1 < pages ? '' : ' disabled'}`}
            title={t('itemCollections.next')}
            onClick={() => current + 1 < pages && (setPage(current + 1), playUiSound('click'))}
          >
            {'>'}
          </div>
        </div>
      )}

      {hover && !pending && (
        <div className="ic-tooltip" style={{ left: Math.min(hover.x, WIDTH - 230), top: hover.y }}>
          {hover.lines.map((line, i) => (
            <div key={i} className={`ic-tip-${line.tone}${i === 0 ? ' first' : ''}`}>
              {line.text}
            </div>
          ))}
        </div>
      )}

      {pending && (
        <div className="ic-confirm-shade" data-no-drag="true">
          <div className="ic-confirm">
            <div className="ic-confirm-title">{t('itemCollections.modal.title')}</div>
            <div className="ic-confirm-item">{slotName(pending.collection.slots[pending.slot])}</div>
            <div>{t('itemCollections.modal.into', { name: pending.collection.name })}</div>
            <div>{t('itemCollections.modal.pick')}</div>
            <div className="ic-confirm-warning">{t('itemCollections.modal.warning')}</div>
            <div className="ic-confirm-buttons">
              <div
                className="ic-button"
                onClick={() => {
                  ItemCollections.register(pending.collection.number, pending.slot);
                  setPending(null);
                  playUiSound('click');
                }}
              >
                {t('itemCollections.modal.register')}
              </div>
              <div
                className="ic-button"
                onClick={() => {
                  setPending(null);
                  playUiSound('click');
                }}
              >
                {t('itemCollections.modal.cancel')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
