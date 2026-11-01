import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { Bag } from '@/modules/inventory';
import { Hero } from '@/modules/hero';
import { countHotkeyItems, findHotkeyItem } from '@/modules/inventory/itemHotkeys';
import { ItemIcon } from '@/controllers/interface/components/item_icon';
import { itemBaseName } from '@versions/shared/items/itemsDatabase';
import { gameVersion } from '@/version';
import { MobileButton, ScaledFrame } from './mobileButton';
import { BOX_HEIGHT, BOX_WIDTH, POTION_SCALE, SKILLBOX_SPRITE, SKILLBOX_USE_SPRITE } from './consts';

const KEYS = ['Q', 'W', 'E', 'R'];

/**
 * The Q/W/E/R potion slots at thumb size. The bar's own slots drink on a right click, which a
 * finger cannot make, and are 20 px wide; a tap here is the key press (`Bag.useItemHotkey`).
 */
const PotionSlot = observer(({ index }: { index: number }) => {
  const items = Hero.items;
  const hotkey = Bag.itemHotkeys[index];
  const slot = findHotkeyItem(items, index, hotkey);
  const item = slot >= 0 ? items[slot] : null;
  const count = item ? countHotkeyItems(items, index, hotkey) : 0;
  const name = item ? itemBaseName(item.group, item.num) : undefined;

  return (
    <MobileButton
      className={`mobile-potion-slot${item ? '' : ' empty'}`}
      title={
        name
          ? t('bottomBar.itemSlot', { name, key: KEYS[index] })
          : t('bottomBar.emptySlot', { key: KEYS[index] })
      }
      onTap={() => Bag.useItemHotkey(index)}
    >
      {pressed => (
        <ScaledFrame
          file={pressed ? SKILLBOX_USE_SPRITE : SKILLBOX_SPRITE}
          width={BOX_WIDTH}
          height={BOX_HEIGHT}
          scale={POTION_SCALE}
        >
          {item && (
            <div className="mobile-potion-art">
              <ItemIcon item={item} />
            </div>
          )}
          {count > 0 && <div className="mobile-potion-count">{count}</div>}
        </ScaledFrame>
      )}
    </MobileButton>
  );
});

/** The version's slots (Season 6 Q/W/E/R, 0.97d Q/W/E), the bar's order. */
export const PotionPad = observer(() => (
  <div className="mobile-potion-slots">
    {KEYS.slice(0, gameVersion.features.itemHotkeys.slots).map((key, i) => (
      <PotionSlot key={key} index={i} />
    ))}
  </div>
));
