import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface/windowManager';
import { ModuleWindowFrame } from '@/controllers/interface/components/module_window';
import { ItemIcon } from '@/controllers/interface/components/item_icon';
import { playUiSound } from '@/controllers/sound/sfx';
import { moduleOn } from '@/modules/module';
import { BANK_JEWELS, JEWEL_BANK_WINDOW, JewelBank, WITHDRAW_AMOUNTS } from '@/modules/jewel_bank';
import { VIP_WINDOW } from '@/modules/vip';
import { AccountBody, AccountButton, AccountTabStrip, amount } from '../_shared/accountWidgets';
import { ITEM_COLLECTIONS_ID, toggleItemCollections } from '../item_collections';
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
    <ModuleWindowFrame id={JEWEL_BANK_WINDOW} title={t('jewelBank.title')} hotKey={HOT_KEY}>
      <AccountBody className="jewel-bank-body">
        <div className="acct-buttons">
          {WITHDRAW_AMOUNTS.map((n, i) => (
            <AccountButton key={n} label={`x${n}`} active={JewelBank.amountIndex === i} onClick={() => JewelBank.selectAmount(i)} />
          ))}
        </div>
        <div className="jewel-bank-head">
          <span>{t('jewelBank.jewel')}</span>
          <span>{t('jewelBank.stored')}</span>
        </div>
        {BANK_JEWELS.map((_, jewel) => {
          const can = JewelBank.canWithdraw(jewel);
          return (
            <div key={jewel} className={`jewel-bank-row${JewelBank.counts[jewel] > 0 ? ' stored' : ''}`}>
              <div className="jewel-bank-icon">
                <ItemIcon item={ICONS[jewel]} />
              </div>
              <span className="jewel-bank-name">{t(`jewelBank.jewel.${jewel}` as TextKey)}</span>
              <span className="jewel-bank-count">{amount(JewelBank.counts[jewel])}</span>
              <AccountButton label="+" title={t('jewelBank.take')} disabled={!can} onClick={() => JewelBank.withdraw(jewel)} />
            </div>
          );
        })}
        <div className="acct-hint">{t('jewelBank.hint')}</div>
      </AccountBody>
    </ModuleWindowFrame>
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

const toggle = (id: string) => MuWindows.setOpen(id, !MuWindows.isOpen(id));

/**
 * Our client's shortcut column beside the inventory (UI/InventoryShortcuts/InventoryShortcutColumn.cpp):
 * the Jewel Bank, the VIP shop and the Item Collections, as tabs over the inventory's frame.
 */
export const InventoryShortcuts = observer(() => {
  const bank = moduleOn('jewel_bank');
  const vip = moduleOn('vip');
  const collections = moduleOn('item_collections');
  if (!bank && !vip && !collections) return null;
  return (
    <AccountTabStrip>
      {bank && (
        <AccountButton label={`${t('jewelBank.title')} (J)`} active={MuWindows.isOpen(JEWEL_BANK_WINDOW)} onClick={() => toggle(JEWEL_BANK_WINDOW)} />
      )}
      {vip && <AccountButton label={t('jewelBank.vip')} active={MuWindows.isOpen(VIP_WINDOW)} onClick={() => toggle(VIP_WINDOW)} />}
      {collections && (
        <AccountButton
          label={`${t('itemCollections.title')} (;)`}
          active={MuWindows.isOpen(ITEM_COLLECTIONS_ID)}
          onClick={() => toggleItemCollections(false)}
        />
      )}
    </AccountTabStrip>
  );
});
