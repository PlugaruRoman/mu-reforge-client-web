import { AddLetterLetterStateEnum, AddLetterPacket, ChatRoomConnectionInfoPacket, FriendAddedPacket, FriendDeletedPacket, FriendInvitationResultPacket, FriendOnlineStateUpdatePacket, FriendRequestPacket, LetterSendResponseLetterSendRequestResultEnum, LetterSendResponsePacket, MessengerInitializationPacket, OpenLetterExtendedPacket, OpenLetterPacket, RemoveLetterPacket } from '@versions/shared/packets/ServerToClientPackets';
import { ChatRooms } from '../chat/chatRooms';
import { EventBus } from '@/core/eventBus';
import { FRIEND_OFFLINE } from './friendList';
import { Messenger } from './messenger';
import { Social } from '../social/social';
import { t, type TextKey } from '@/i18n';
import { UI_BUS, playSfx } from '@/controllers/sound/sfx';
import { cleanName } from '../chat/chat';
import { readWireString } from '@/core/binaryUtils';
import { runInAction } from 'mobx';

// ---- friends & letters (`ReceiveFriend*` / `ReceiveLetter*`) ----------------

/** The friend `Server` byte: 0xFF is offline, anything else a game server. */
const friendServer = (serverId: number) =>
  serverId === FRIEND_OFFLINE ? -1 : serverId;

/** Our server's AddLetter length (S ServerToClientPackets.xml); the classic one is 79. */
const ADD_LETTER_REFORGE_LENGTH = 107;

const LETTER_SEND_RESULTS: Record<
  LetterSendResponseLetterSendRequestResultEnum,
  TextKey
> = {
  [LetterSendResponseLetterSendRequestResultEnum.Success]: 'friends.letterSent',
  [LetterSendResponseLetterSendRequestResultEnum.TryAgain]: 'friends.letterTryAgain',
  [LetterSendResponseLetterSendRequestResultEnum.MailboxFull]: 'friends.mailboxFull',
  [LetterSendResponseLetterSendRequestResultEnum.ReceiverNotExists]:
    'friends.noSuchCharacter',
  [LetterSendResponseLetterSendRequestResultEnum.CantSendToYourself]:
    'friends.cannotLetterSelf',
  [LetterSendResponseLetterSendRequestResultEnum.NotEnoughMoney]:
    'friends.letterNeedsZen',
};

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  /**
   * MessengerInitialization (C2 0xC0): sent right after entering the game with
   * the whole friend list and the size of the letter box. The letters
   * themselves follow one AddLetter at a time.
   */
  EventBus.on('MessengerInitialization', packet => {
    const p = new MessengerInitializationPacket(packet);
    Messenger.setFriends(
      p.getFriends().map(f => ({
        name: cleanName(f.Name),
        server: friendServer(f.ServerId),
      }))
    );
    runInAction(() => {
      Messenger.maxLetters = p.MaximumLetterCount;
      Messenger.letters = [];
    });
  });

  EventBus.on('FriendAdded', packet => {
    const p = new FriendAddedPacket(packet);
    const name = cleanName(p.FriendName);
    Messenger.addFriend(name, friendServer(p.ServerId));
    Social.systemMessage(t('friends.added', { name }));
  });

  EventBus.on('FriendDeleted', packet => {
    const p = new FriendDeletedPacket(packet);
    Messenger.removeFriend(cleanName(p.FriendName));
  });

  EventBus.on('FriendOnlineStateUpdate', packet => {
    const p = new FriendOnlineStateUpdatePacket(packet);
    Messenger.setFriendState(cleanName(p.FriendName), friendServer(p.ServerId));
  });

  /** FriendRequest (0xC2): another player wants to add the hero. */
  EventBus.on('FriendRequest', packet => {
    const p = new FriendRequestPacket(packet);
    // ReceiveRequestAcceptAddFriend (WSclient.cpp:9786): SOUND_FRIEND_LOGIN_ALERT.
    playSfx('Sound/iFLogInAlert', null, { bus: UI_BUS, channels: 1 });
    runInAction(() => {
      Messenger.friendRequest = { name: cleanName(p.Requester) };
    });
  });

  /**
   * FriendInvitationResult (C3 0xCB): the answer to ChatRoomInvitationRequest,
   * echoing the RequestId the invite went out with. Anything with an unknown
   * id is kept on the old friend-request path.
   */
  EventBus.on('FriendInvitationResult', packet => {
    const p = new FriendInvitationResultPacket(packet);
    if (ChatRooms.inviteResult(p.Success, p.RequestId)) return;
    if (!p.Success) Social.errorMessage(t('friends.requestFailed'));
  });

  /**
   * ChatRoomConnectionInfo (C3 0xCA): the game server brokered a chat room on
   * the separate chat server and hands over host, room id and token. The
   * packet carries no port; OpenMU's chat server listens on 55980.
   */
  EventBus.on('ChatRoomConnectionInfo', packet => {
    const p = new ChatRoomConnectionInfoPacket(packet);
    ChatRooms.onConnectionInfo({
      host: cleanName(p.ChatServerIp),
      roomId: p.ChatRoomId,
      token: p.AuthenticationToken,
      friendName: cleanName(p.FriendName),
      success: p.Success,
    });
  });

  /** AddLetter (C3 0xC6): one row of the letter box. */
  EventBus.on('AddLetter', packet => {
    const p = new AddLetterPacket(packet);
    // Our server's AddLetter is 107 bytes: a 60-byte subject at 46 and the state at 106
    // (S ServerToClientPackets.xml AddLetter, RemoteView/Messenger/AddToLetterListPlugIn.cs;
    // client WSclient.h FS_LETTER_ALERT Subject[MAX_LETTER_TITLE_LENGTH = 60]).
    const wide = packet.byteLength >= ADD_LETTER_REFORGE_LENGTH;
    const state: AddLetterLetterStateEnum = wide ? packet.getUint8(106) : p.State;
    const isNew = state === AddLetterLetterStateEnum.New;
    Messenger.addLetter({
      index: p.LetterIndex,
      sender: cleanName(p.SenderName),
      subject: cleanName(wide ? readWireString(packet, 46, 106) : p.Subject),
      timestamp: p.Timestamp.replace(/\0+$/, '').trim(),
      read: state === AddLetterLetterStateEnum.Read,
      isNew,
    });
    // `New` means it landed while the hero was online, so it is announced
    // (ReceiveLetter, WSclient.cpp:9925: SOUND_FRIEND_MAIL_ALERT).
    if (isNew) {
      playSfx('Sound/iFMailAlert', null, { bus: UI_BUS, channels: 1 });
      Social.systemMessage(
        t('friends.letterArrived', { name: cleanName(p.SenderName) })
      );
    }
  });

  /** OpenLetter (C4 0xC7): the body of the letter that was asked for. */
  EventBus.on('OpenLetter', packet => {
    const p = new OpenLetterPacket(packet);
    Messenger.setLetterBody(p.LetterIndex, p.Message.replace(/\0+$/, ''));
  });

  // C4 C7 at 106.3: a 42-byte appearance block at 6 pushes the message to 50
  // (S RemoteView/Messenger/ShowLetterExtendedPlugIn.cs; client WSclient.cpp ReceiveLetterText).
  EventBus.on('OpenLetterExtended', packet => {
    const p = new OpenLetterExtendedPacket(packet);
    Messenger.setLetterBody(p.LetterIndex, p.Message.replace(/\0+$/, ''));
  });

  EventBus.on('RemoveLetter', packet => {
    const p = new RemoveLetterPacket(packet);
    if (p.RequestSuccessful) Messenger.removeLetter(p.LetterIndex);
    else Social.errorMessage(t('friends.letterDeleteFailed'));
  });

  EventBus.on('LetterSendResponse', packet => {
    const p = new LetterSendResponsePacket(packet);
    const ok = p.Result === LetterSendResponseLetterSendRequestResultEnum.Success;
    Messenger.sendFinished(ok);
    const text = t(LETTER_SEND_RESULTS[p.Result] ?? 'friends.letterFailed');
    if (ok) Social.systemMessage(text);
    else Social.errorMessage(text);
  });
}
