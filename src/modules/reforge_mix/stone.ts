import type { Item } from '@/ecs/world';
import type { TooltipLine } from '@/controllers/interface';
import { t } from '@/i18n';
import { ANCIENT_SOUL_STONE } from './recipes';

/** The Ancient Soul Stone's tooltip lines (our client's ReforgeItemTooltip.cpp `AddJewelLines`): white, then green. */
export function ancientSoulStoneLines(item: Pick<Item, 'group' | 'num'>): TooltipLine[] {
  if (item.group !== 14 || item.num !== ANCIENT_SOUL_STONE) return [];
  return [
    { text: t('reforgeMix.stone'), color: 'white', bold: false },
    { text: t('reforgeMix.stoneUse'), color: 'green', bold: false },
  ];
}
