// Public API of the quest_board module: windows and other modules import from here.
export { QUEST_STATE, QuestBoard, canAccept, canClaim, currentQuest, goalReached, progress, type BoardQuest } from './state';
export { QUEST_BOARD_WINDOW, QUEST_MASTER_NPC, acceptQuest, claimQuest, closeQuestBoard } from './net';
