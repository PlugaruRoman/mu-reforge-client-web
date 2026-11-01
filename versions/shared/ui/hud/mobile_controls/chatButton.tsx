import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { Social } from '@/modules/social/social';
import { MobileButton, ScaledFrame } from './mobileButton';
import { BOX_HEIGHT, BOX_WIDTH, SLOT_SCALE, SKILLBOX_SPRITE, SKILLBOX_USE_SPRITE } from './consts';

/**
 * Enter, for a phone: opens the chat box (the keyboard comes up with its focus) and closes it
 * again. The box itself is the desktop one.
 */
export const ChatButton = observer(() => {
  const open = Social.chatInputOpen;

  return (
    <MobileButton
      className="mobile-chat-button"
      title={t('chat.tab.chat')}
      onTap={() => (Social.chatInputOpen ? Social.closeChatInput() : Social.openChatInput())}
    >
      {pressed => (
        <ScaledFrame
          file={pressed || open ? SKILLBOX_USE_SPRITE : SKILLBOX_SPRITE}
          width={BOX_WIDTH}
          height={BOX_HEIGHT}
          scale={SLOT_SCALE}
        >
          <svg className="mobile-glyph" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h16v10H9l-5 4z" />
          </svg>
        </ScaledFrame>
      )}
    </MobileButton>
  );
});
