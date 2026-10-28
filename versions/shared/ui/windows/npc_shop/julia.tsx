import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { playUiSound } from '@/controllers/sound/sfx';
import { Julia, closeJulia, juliaWarp } from '@/modules/npc_shop';
import { NoticeBox } from '../reforge_events/noticeBox';

/**
 * Julia's warp window (our client's UI/Inventory/UnitedMarketPlaceWindow.cpp): the market's lines in
 * Lorencia, the town's in the Loren Market; OK warps (once), Cancel closes. Registered by `window.ts`.
 */
export const JuliaDialog = observer(() => {
  if (!Julia.open) return null;
  const lines = Julia.inMarket
    ? [t('julia.town'), '', t('julia.townAsk')]
    : [t('julia.market1'), t('julia.market2'), t('julia.market3'), '', t('julia.marketAsk')];
  return (
    <NoticeBox
      lines={lines}
      onOk={() => {
        playUiSound('click');
        juliaWarp();
      }}
      onCancel={() => {
        playUiSound('click');
        closeJulia();
      }}
    />
  );
});
