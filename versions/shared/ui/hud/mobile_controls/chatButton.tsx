import { flushSync } from 'react-dom';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { Social } from '@/modules/social/social';
import { MobileButton } from './mobileButton';
import { TouchIcon } from './icons';

/**
 * Enter, for a phone (our Android client's `#chat`): opens the chat line and closes it again (a phone
 * has no Escape). The line is drawn inside the tap and focused there, synchronously: a phone only
 * brings its keyboard up for a focus made by the finger's own event.
 */
export const ChatButton = observer(() => (
  <MobileButton
    className={`touch-btn touch-round touch-chat${Social.chatInputOpen ? ' on' : ''}`}
    title={t('chat.tab.chat')}
    onTap={() => {
      if (Social.chatInputOpen) {
        Social.closeChatInput();
        return;
      }
      flushSync(() => Social.openChatInput());
      document.querySelector<HTMLInputElement>('.chat-text-field')?.focus();
    }}
  >
    {() => <TouchIcon name="chat" />}
  </MobileButton>
));
