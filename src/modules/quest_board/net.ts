import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { MuWindows } from '@/controllers/interface/windowManager';
import { playUiSound } from '@/controllers/sound/sfx';
import { Session } from '../session';
import { registerNpcClick } from '../npc_shop';
import {
  QuestBoard,
  buildAcceptRequest,
  buildActiveRequest,
  buildBoardRequest,
  buildClaimRequest,
  canAccept,
  canClaim,
  currentQuest,
  forgetQuestBoard,
  parseQuestBoard,
  setActiveQuests,
  setBoard,
} from './state';

/** The board's window (`versions/shared/ui/windows/quest_board`). */
export const QUEST_BOARD_WINDOW = 'quest_board';
/** Captain Slough (S `QuestBoardTalkPlugIn.QuestMasterNpcNumber`). */
export const QUEST_MASTER_NPC = 763;

const send = (frame: DataView) => {
  if (!Session.isOffline) Session.sendToGS(frame);
};

/** Accept: the current quest when it may be taken (`CQuestBoardWindow::Accept`). */
export function acceptQuest(): void {
  const quest = QuestBoard.board[currentQuest(QuestBoard.board)];
  if (!quest || !canAccept(quest)) return;
  send(buildAcceptRequest(quest.number));
  playUiSound('click');
}

/** Claim: the active quest once its goal is reached (`CQuestBoardWindow::Claim`). */
export function claimQuest(): void {
  const quest = QuestBoard.board[currentQuest(QuestBoard.board)];
  if (!quest || !canClaim(quest)) return;
  send(buildClaimRequest());
  playUiSound('click');
}

export function closeQuestBoard(): void {
  runInAction(() => MuWindows.setOpen(QUEST_BOARD_WINDOW, false));
}

/** Registers the listeners; the module's `install` calls it. */
export function installNet(): void {
  // DF 01 opens the board (UI/QuestBoard/QuestBoardUpdates.cpp `BoardReceived`), also after an accept or claim
  // (S QuestBoardAccept/ClaimHandlerPlugIn), which leaves the active quests (DF 05) stale: each asks for them again.
  EventBus.on('QuestBoardList', view => {
    const board = parseQuestBoard(view);
    if (!board) return;
    setBoard(board);
    if (!MuWindows.isOpen(QUEST_BOARD_WINDOW)) runInAction(() => MuWindows.setOpen(QUEST_BOARD_WINDOW, true));
    send(buildActiveRequest());
  });
  EventBus.on('QuestBoardActiveList', view => {
    const active = parseQuestBoard(view);
    if (active) setActiveQuests(active);
  });
  EventBus.on('wsClosed', forgetQuestBoard);
  EventBus.on('heroWalked', () => {
    if (MuWindows.isOpen(QUEST_BOARD_WINDOW)) closeQuestBoard();
  });
  // A click on Captain Slough asks for the board (DF 01) instead of a talk: the server's talk plug-in
  // answers a talk with the same board, and this leaves no NPC dialog open on its side.
  registerNpcClick(QUEST_MASTER_NPC, () => {
    send(buildBoardRequest());
    return true;
  });
}
