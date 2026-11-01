import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { moduleOn } from '@/modules/module';
import { OfflineModes } from '@/modules/offline_modes';
import { NoticeBox } from '../reforge_events/noticeBox';
import { SidePlate } from '../_shared/sidePlates';

/**
 * Our server's offline hand-overs as our client's plates: OFF EXP off the MU Helper window's left edge
 * (mu_helper_config.rml `#btn_reforge_offexp`, UI/Reforge/ReforgeMuHelperOptions.cpp) and OFF STORE
 * in the personal store's bottom row (my_shop.rcss `.reforge-offstore`, ReforgeOffStore.cpp). Each
 * shows only while `offline_modes` is on (a Mu Reforge world).
 */

/** OFF EXP: saves the settings, then `/offlevel`. At (-44, 388), 0.78 until hovered. */
export const OffExpButton = observer(() =>
  moduleOn('offline_modes') ? (
    <SidePlate
      top={388}
      className="dim"
      file="newui_muhelper_btn_offexp.OZT"
      title={t('reforgeHud.offExp')}
      description={t('reforgeHud.offExpHint')}
      onClick={() => OfflineModes.offLevel()}
    />
  ) : null
);

/** OFF STORE: the store's title and prices first, then the confirmation. The fourth plate of the row. */
export const OffStoreButton = observer(
  ({ title, left, top }: { title: string; left: number; top: number }) =>
    moduleOn('offline_modes') ? (
      <SidePlate
        top={top}
        left={left}
        className="tip-above"
        file="newui_Bt_offstore.OZT"
        title={t('reforgeHud.offStore')}
        description={t('reforgeHud.offStoreHint')}
        onClick={() => OfflineModes.askOffStore(title)}
      />
    ) : null
);

/** The confirmation `Start` raises; registered by `window.ts`. */
export const OffStoreConfirm = observer(() =>
  OfflineModes.confirmStore === null ? null : (
    <NoticeBox
      lines={[
        t('reforgeHud.offStoreConfirmTitle'),
        t('reforgeHud.offStoreConfirm1'),
        t('reforgeHud.offStoreConfirm2'),
      ]}
      onOk={() => OfflineModes.offStore()}
      onCancel={() => OfflineModes.cancelOffStore()}
    />
  )
);
