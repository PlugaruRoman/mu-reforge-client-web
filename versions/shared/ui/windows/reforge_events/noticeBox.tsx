import { MsgBoxFrame, MSGBOX_WIDTH, msgBoxHeight } from '@/controllers/interface/components/msg_box_frame';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { useUiStageScale, UI_STAGE_HEIGHT, UI_STAGE_WIDTH } from '@/controllers/interface/components/ui_stage';
import { observer } from 'mobx-react-lite';

/** Places a 640x480-stage point on the window, scaled like the sheets. */
export function useStage() {
  const scale = useUiStageScale();
  const offsetX = (window.innerWidth - UI_STAGE_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - UI_STAGE_HEIGHT * scale) / 2;
  return (x: number, y: number) => ({
    position: 'absolute' as const,
    left: offsetX + x * scale,
    top: offsetY + y * scale,
    transform: `scale(${scale})`,
    transformOrigin: 'left top',
  });
}

const LINE = 15;
const OK = { width: 54, height: 30, bottom: 50 };

/**
 * `UI::Dialogs::ShowConfirm` of our client: the message box with its lines and OK (and Cancel when
 * `onCancel` is given), centred at y 100 like `CNewUICommonMessageBox`.
 */
export const NoticeBox = observer(({ lines, onOk, onCancel }: { lines: readonly string[]; onOk: () => void; onCancel?: () => void }) => {
  const at = useStage();
  const middle = Math.max(0, lines.length - 2);
  const buttons = onCancel ? [onOk, onCancel] : [onOk];
  return (
    <MsgBoxFrame lines={middle} className="re-notice" style={at((UI_STAGE_WIDTH - MSGBOX_WIDTH) / 2, 100)}>
      <div className="re-notice-text" style={{ lineHeight: `${LINE}px` }}>
        {lines.map((line, i) => (
          <div key={i}>{line || ' '}</div>
        ))}
      </div>
      {buttons.map((click, i) => (
        <MuButton
          key={i}
          file={i === 0 ? 'newui_button_ok.OZT' : 'newui_button_cancel.OZT'}
          width={OK.width}
          height={OK.height}
          frames={{ up: 0, active: 1, down: 2 }}
          onClick={click}
          style={{
            position: 'absolute',
            left: buttons.length === 1 ? (MSGBOX_WIDTH - OK.width) / 2 : MSGBOX_WIDTH / 2 + (i === 0 ? -OK.width - 8 : 8),
            top: msgBoxHeight(middle) - OK.bottom,
          }}
        />
      ))}
    </MsgBoxFrame>
  );
});
