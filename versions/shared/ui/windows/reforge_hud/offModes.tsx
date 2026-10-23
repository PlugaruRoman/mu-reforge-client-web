import type { CSSProperties } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { playUiSound } from '@/controllers/sound/sfx';
import { moduleOn } from '@/modules/module';
import { OfflineModes } from '@/modules/offline_modes';
import { NoticeBox } from '../reforge_events/noticeBox';

/**
 * Our server's offline hand-overs as buttons: OFF EXP in the MU Helper window
 * (UI/Reforge/ReforgeMuHelperOptions.cpp) and OFF in the personal store (ReforgeOffStore.cpp).
 * Each shows only while `offline_modes` is on (a Mu Reforge world).
 */

const OffButton = observer(({ label, hint, onClick, style }: { label: string; hint: string; onClick: () => void; style?: CSSProperties }) => (
  <div
    className="rh-off-button"
    data-no-drag="true"
    title={hint}
    style={style}
    onClick={() => {
      playUiSound('click');
      onClick();
    }}
  >
    {label}
  </div>
));

/** OFF EXP: saves the settings, then `/offlevel`. */
export const OffExpButton = observer(({ style }: { style?: CSSProperties }) =>
  moduleOn('offline_modes') ? (
    <OffButton label={t('reforgeHud.offExp')} hint={t('reforgeHud.offExpHint')} onClick={() => OfflineModes.offLevel()} style={style} />
  ) : null
);

/** OFF: the store's title and prices first, then the confirmation. */
export const OffStoreButton = observer(({ title, style }: { title: string; style?: CSSProperties }) =>
  moduleOn('offline_modes') ? (
    <OffButton label={t('reforgeHud.offStore')} hint={t('reforgeHud.offStoreHint')} onClick={() => OfflineModes.askOffStore(title)} style={style} />
  ) : null
);

/** The confirmation `Start` raises; registered by `window.ts`. */
export const OffStoreConfirm = observer(() =>
  OfflineModes.confirmStore === null ? null : (
    <NoticeBox
      lines={[t('reforgeHud.offStoreConfirmTitle'), t('reforgeHud.offStoreConfirm1'), t('reforgeHud.offStoreConfirm2')]}
      onOk={() => OfflineModes.offStore()}
      onCancel={() => OfflineModes.cancelOffStore()}
    />
  )
);
