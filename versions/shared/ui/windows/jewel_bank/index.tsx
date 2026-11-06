import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { ItemIcon } from '@/controllers/interface/components/item_icon';
import { playUiSound } from '@/controllers/sound/sfx';
import { moduleOn } from '@/modules/module';
import { BANK_JEWELS, JEWEL_BANK_WINDOW, JewelBank, WITHDRAW_AMOUNTS } from '@/modules/jewel_bank';
import { AccountButton, amount } from '../_shared/accountWidgets';
import { ReforgeShell, RfFooter, RfList, RfTableHead, RfTabs } from '../_shared/reforgeShell';
import type { Item } from '@/ecs/world';
import './style.less';

/** Our client's key J (UI/Reforge/ReforgeHotkeys.cpp `JewelBankKey`). */
const HOT_KEY = 'KeyJ';

const ICONS: readonly Item[] = BANK_JEWELS.map(j => ({ group: j.group, num: j.num }));

/**
 * `CJewelBankWindow` (UI/JewelBank/JewelBankWindow.cpp, reforge_jewel_bank.rml): the amount one
 * withdrawal takes, one row per jewel with its stored count and take button, the deposit hint.
 * Deposits are a right click on a jewel in the bag while this is open (`depositFromBag`).
 */
export const JewelBankWindow = observer(() => {
  const open = MuWindows.isOpen(JEWEL_BANK_WINDOW);

  useEffect(() => {
    if (open) JewelBank.requestList();
  }, [open]);

  return (
    <ReforgeShell id={JEWEL_BANK_WINDOW} title={t('jewelBank.title')} hotKey={HOT_KEY} width={240} height={459} className="jewel-bank-body">
      <RfTabs
        tabs={WITHDRAW_AMOUNTS.map((n, i) => ({ id: i, label: `x${n}` }))}
        active={JewelBank.amountIndex}
        onSelect={i => JewelBank.selectAmount(i)}
      />
      <RfTableHead className="jewel-bank-head" columns={[{ label: t('jewelBank.jewel') }, { label: t('jewelBank.stored'), width: 70, align: 'right' }]} />
      <RfList height={287}>
        {BANK_JEWELS.map((_, jewel) => {
          const can = JewelBank.canWithdraw(jewel);
          return (
            <div key={jewel} className={`rf-row jewel-bank-row${JewelBank.counts[jewel] > 0 ? ' stored' : ''}`}>
              <div className="jewel-bank-icon">
                <ItemIcon item={ICONS[jewel]} />
              </div>
              <span className="jewel-bank-name">{t(`jewelBank.jewel.${jewel}` as TextKey)}</span>
              <span className="jewel-bank-count">{amount(JewelBank.counts[jewel])}</span>
              <AccountButton
                className="jewel-bank-take"
                label="+"
                title={t('jewelBank.take')}
                disabled={!can}
                onClick={() => JewelBank.withdraw(jewel)}
              />
            </div>
          );
        })}
      </RfList>
      <RfFooter className="jewel-bank-hint">{t('jewelBank.hint')}</RfFooter>
    </ReforgeShell>
  );
});

/**
 * The bag's right click while the bank is open (JewelBankDeposit.cpp `TryDepositAtPointer`): a
 * jewel the bank keeps goes in. True when it was taken; on a world without the bank, never.
 */
export function depositFromBag(slot: number, item: Item): boolean {
  if (!moduleOn('jewel_bank') || !MuWindows.isOpen(JEWEL_BANK_WINDOW)) return false;
  if (!JewelBank.deposit(slot, item)) return false;
  playUiSound('getItem');
  return true;
}
