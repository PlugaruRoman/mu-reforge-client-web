import './pager.less';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { moduleOn } from '@/modules/module';
import { VaultPages } from '@/modules/vault_pages';

/** `#reforge_vault_pager` of our client's storage.rml: [<] 2/5 [>], 54 x 22 at (124, 394). */
const PAGER_X = 124;
const PAGER_Y = 394;

/**
 * The paged vault's arrows (Mu Reforge, `vault_pages`): drawn only while that module is on and the
 * vault has more than one page, so the classic vault is unchanged everywhere else.
 */
export const VaultPager = observer(() => {
  if (!moduleOn('vault_pages') || !VaultPages.paged) return null;

  return (
    <div className="vault-pager" data-no-drag="true" style={{ left: PAGER_X, top: PAGER_Y }}>
      <div
        className={`vault-page-btn prev${VaultPages.hasPrev ? '' : ' disabled'}`}
        title={t('vaultPages.previous')}
        onClick={() => VaultPages.request(-1)}
      >
        {'<'}
      </div>
      <span className="vault-page-text">{`${VaultPages.current + 1}/${VaultPages.count}`}</span>
      <div
        className={`vault-page-btn next${VaultPages.hasNext ? '' : ' disabled'}`}
        title={t('vaultPages.next')}
        onClick={() => VaultPages.request(1)}
      >
        {'>'}
      </div>
    </div>
  );
});
